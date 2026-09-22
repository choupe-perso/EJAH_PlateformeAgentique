# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""DOCX handler: text is replaced by vault tokens run-by-run (see
_run_splice), whole embedded images are swapped for a static placeholder
when OCR finds PII in them (see _ooxml_media). Both directions are
reversible: `deanonymize` restores the original text and the original
image bytes exactly, via the same vault used to anonymize.

The image token that makes restoration possible is stored in the
drawing's own `<wp:docPr descr="...">` attribute (standard alt-text
field) - invisible in normal use, read back by `deanonymize` to know
which vault entry to restore each image from.

Known coverage gaps, documented rather than silently swallowed:
- Tracked changes (<w:ins>/<w:del>): if present, a warning is printed;
  accept/reject them before anonymizing for a reliable result.
- Comments, footnotes/endnotes: separate document parts, out of scope.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.text.run import Run

from app.domain.engine import detect_only
from app.domain.entities import EntityType
from app.tools.formats import _ocr
from app.tools.formats._assets import placeholder_image_bytes
from app.tools.formats._known_logos import is_known_logo
from app.tools.formats._ooxml_media import replace_zip_members
from app.tools.formats._run_splice import (
    detect_in_paragraphs,
    replace_in_paragraphs,
    restore_in_paragraphs,
)
from app.domain.span import Span
from app.domain.vault import Vault

_IMAGE_TOKEN_RE = re.compile(r"\[IMAGE_\d+\]")


def _iter_block_paragraphs(parent_elm, parent):
    for child in parent_elm.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, parent)
        elif isinstance(child, CT_Tbl):
            table = Table(child, parent)
            for row in table.rows:
                for cell in row.cells:
                    yield from _iter_block_paragraphs(cell._tc, cell)


def _text_containers(document: Document) -> list[tuple]:
    """Every (element, parent) container whose paragraphs should be
    scanned: the body, plus each section's header/footer (skipping ones
    linked to the previous section, so a shared part isn't processed
    twice)."""
    containers = [(document.element.body, document)]
    seen_parts: set[int] = set()
    for section in document.sections:
        for container in (section.header, section.footer):
            if container.is_linked_to_previous:
                continue
            if id(container.part) in seen_parts:
                continue
            seen_parts.add(id(container.part))
            containers.append((container._element, container))
    return containers


def _all_paragraphs(document: Document) -> list[Paragraph]:
    paragraphs: list[Paragraph] = []
    for elm, parent in _text_containers(document):
        paragraphs.extend(_iter_block_paragraphs(elm, parent))
    return paragraphs


def _runs_in_paragraph(p_elm, parent) -> list[Run]:
    """All runs belonging to this paragraph element, in document order,
    including runs nested inside a <w:hyperlink> child - `paragraph.runs`
    (python-docx) only sees direct <w:r> children of <w:p>, so a
    hyperlink's display text (e.g. a website or e-mail shown as link text)
    would otherwise never be detected/anonymized."""
    runs: list[Run] = []
    for child in p_elm.iterchildren():
        if child.tag == qn("w:r"):
            runs.append(Run(child, parent))
        elif child.tag == qn("w:hyperlink"):
            for r in child.iterchildren(qn("w:r")):
                runs.append(Run(r, parent))
    return runs


def _textbox_paragraph_runs(container_elm, parent) -> list[list[Run]]:
    """One entry per paragraph living inside a text box (<w:txbxContent>,
    DrawingML shape or legacy VML) anywhere under this container - not
    reached by `_iter_block_paragraphs` (it only follows <w:p>/<w:tbl> as
    direct children of a container; a text box's content sits nested
    several levels down, inside a run's <w:drawing>/<w:pict>). `parent` is
    reused as-is for every run found - a text box lives in the same part
    (body/header/footer) as the shape that carries it, so the same
    part/relationship resolution applies."""
    result: list[list[Run]] = []
    for txbx in container_elm.iter(qn("w:txbxContent")):
        for p in txbx.iterchildren(qn("w:p")):
            result.append(_runs_in_paragraph(p, parent))
    return result


def _all_runs_by_paragraph(document: Document) -> list[list[Run]]:
    """One entry per paragraph (body, headers/footers, table cells, and
    text boxes), each a list of that paragraph's runs including hyperlink
    text - the unit `_run_splice.py`'s detect/replace/restore functions
    operate on."""
    result: list[list[Run]] = [_runs_in_paragraph(p._p, p._parent) for p in _all_paragraphs(document)]
    for elm, parent in _text_containers(document):
        result.extend(_textbox_paragraph_runs(elm, parent))
    return result


def _warn_if_tracked_changes(document: Document, path: Path) -> None:
    for elm, _parent in _text_containers(document):
        if elm.find(qn("w:ins")) is not None or elm.find(qn("w:del")) is not None:
            print(
                f"Avertissement : {path} contient des révisions suivies non acceptées/"
                "rejetées ; la détection peut être imprécise sur ce texte.",
                file=sys.stderr,
            )
            return


def _find_doc_pr(blip):
    """Walk up from a <a:blip> to its enclosing <wp:inline>/<wp:anchor>
    and return that drawing's <wp:docPr> element (the alt-text/description
    field docPr.descr is stored on) - or None if the structure is
    unexpected (never seen in practice, defensive only)."""
    elm = blip
    while elm is not None:
        if elm.tag in (qn("wp:inline"), qn("wp:anchor")):
            return elm.find(qn("wp:docPr"))
        elm = elm.getparent()
    return None


def _iter_image_parts(document: Document):
    """Yields (image_part, doc_pr) for every embedded image found in the
    body and headers/footers. `doc_pr` is the drawing's alt-text element
    (or None if it couldn't be located) - used to tag/read the image's
    vault token for reversible restoration."""
    parts = {document.part}
    for elm, parent in _text_containers(document):
        if parent is not document:
            parts.add(parent.part)
    for part in parts:
        for blip in part.element.iter(qn("a:blip")):
            rid = blip.get(qn("r:embed"))
            if not rid:
                continue
            rel = part.rels.get(rid)
            if rel is None or rel.is_external:
                continue
            yield rel.target_part, _find_doc_pr(blip)


def _image_pii_spans(image_bytes: bytes) -> list[Span]:
    ocr_text = _ocr.image_text(image_bytes)
    if ocr_text.strip():
        spans = detect_only(ocr_text)
        if spans:
            return spans
    # OCR-proof fallback: a highly stylized logo (thick geometric
    # lettering, e.g. a client's own wordmark) can defeat OCR entirely -
    # confirmed on a real document (see _known_logos.py). The same
    # client's template reuses the identical image bytes across every
    # document, so an exact-hash match still reliably catches it.
    if is_known_logo(image_bytes):
        return [Span(0, 0, "[logo]", EntityType.EMPLOYEUR, 1.0, "known_logo")]
    return []


def inspect(path: Path) -> list[Span]:
    document = Document(str(path))
    _warn_if_tracked_changes(document, path)

    spans = detect_in_paragraphs(_all_runs_by_paragraph(document))
    for image_part, _doc_pr in _iter_image_parts(document):
        spans.extend(_image_pii_spans(image_part.blob))
    return spans


def anonymize(path: Path, vault: Vault, out_path: Path | None = None) -> tuple[Path, list[Span]]:
    document = Document(str(path))
    _warn_if_tracked_changes(document, path)

    paragraphs = _all_runs_by_paragraph(document)
    spans = replace_in_paragraphs(paragraphs, vault)

    image_replacements: dict[str, bytes] = {}
    for image_part, doc_pr in _iter_image_parts(document):
        img_spans = _image_pii_spans(image_part.blob)
        if not img_spans:
            continue
        for s in img_spans:
            vault.tokenize(s.entity_type, s.text)
        spans.extend(img_spans)

        image_token = vault.tokenize_bytes(EntityType.IMAGE, image_part.blob)
        if doc_pr is not None:
            doc_pr.set("descr", image_token)
        member = str(image_part.partname).lstrip("/")
        image_replacements[member] = placeholder_image_bytes()

    out_path = out_path if out_path is not None else path.with_suffix(".anonymise.docx")
    document.save(str(out_path))
    replace_zip_members(out_path, image_replacements)
    return out_path, spans


def deanonymize(path: Path, vault: Vault, out_path: Path | None = None) -> Path:
    document = Document(str(path))

    paragraphs = _all_runs_by_paragraph(document)
    restore_in_paragraphs(paragraphs, vault)

    image_restorations: dict[str, bytes] = {}
    for image_part, doc_pr in _iter_image_parts(document):
        if doc_pr is None:
            continue
        descr = doc_pr.get("descr") or ""
        match = _IMAGE_TOKEN_RE.search(descr)
        if not match:
            continue
        original_bytes = vault.resolve_bytes(match.group(0))
        if original_bytes is None:
            continue
        member = str(image_part.partname).lstrip("/")
        image_restorations[member] = original_bytes
        doc_pr.set("descr", descr.replace(match.group(0), ""))

    out_path = out_path if out_path is not None else path.with_suffix(".restored.docx")
    document.save(str(out_path))
    replace_zip_members(out_path, image_restorations)
    return out_path
