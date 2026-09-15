"""DOCX handler: text is replaced by vault tokens run-by-run (see
_run_splice), whole embedded images are swapped for a static placeholder
when OCR finds PII in them (see _ooxml_media). No deanonymize - restoring
the original document isn't implemented for docx (see the project plan);
the vault's token -> value table is the audit trail.

Known coverage gaps, documented rather than silently swallowed:
- Text inside text boxes (<wps:txbx>) isn't reached by `paragraph.runs`.
- Text inside a hyperlink (<w:hyperlink><w:r>...) isn't reached by
  `paragraph.runs` either (a python-docx limitation) - a hyperlinked
  e-mail address or name shown as display text won't be detected.
- Tracked changes (<w:ins>/<w:del>): if present, a warning is printed;
  accept/reject them before anonymizing for a reliable result.
- Comments, footnotes/endnotes: separate document parts, out of scope.
"""
from __future__ import annotations

import sys
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph

from anonymizer.engine import detect_only
from anonymizer.formats import _ocr
from anonymizer.formats._assets import placeholder_image_bytes
from anonymizer.formats._ooxml_media import replace_zip_members
from anonymizer.formats._run_splice import detect_in_paragraphs, replace_in_paragraphs
from anonymizer.span import Span
from anonymizer.vault import Vault


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


def _warn_if_tracked_changes(document: Document, path: Path) -> None:
    for elm, _parent in _text_containers(document):
        if elm.find(qn("w:ins")) is not None or elm.find(qn("w:del")) is not None:
            print(
                f"Avertissement : {path} contient des révisions suivies non acceptées/"
                "rejetées ; la détection peut être imprécise sur ce texte.",
                file=sys.stderr,
            )
            return


def _iter_image_parts(document: Document):
    """Yields (owning_part, image_part) for every embedded image found in
    the body and headers/footers."""
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
            yield part, rel.target_part


def _image_pii_spans(image_bytes: bytes) -> list[Span]:
    ocr_text = _ocr.image_text(image_bytes)
    if not ocr_text.strip():
        return []
    return detect_only(ocr_text)


def inspect(path: Path, avec_images: bool = True) -> list[Span]:
    document = Document(str(path))
    _warn_if_tracked_changes(document, path)

    spans = detect_in_paragraphs([p.runs for p in _all_paragraphs(document)])
    if avec_images:
        for _part, image_part in _iter_image_parts(document):
            spans.extend(_image_pii_spans(image_part.blob))
    return spans


def anonymize(
    path: Path, vault: Vault, out_path: Path | None = None, avec_images: bool = True
) -> tuple[Path, list[Span]]:
    document = Document(str(path))
    _warn_if_tracked_changes(document, path)

    paragraphs = [p.runs for p in _all_paragraphs(document)]
    spans = replace_in_paragraphs(paragraphs, vault)

    image_replacements: dict[str, bytes] = {}
    if avec_images:
        for _part, image_part in _iter_image_parts(document):
            img_spans = _image_pii_spans(image_part.blob)
            if not img_spans:
                continue
            for s in img_spans:
                vault.tokenize(s.entity_type, s.text)
            spans.extend(img_spans)
            member = str(image_part.partname).lstrip("/")
            image_replacements[member] = placeholder_image_bytes()

    out_path = out_path if out_path is not None else path.with_suffix(".anon.docx")
    document.save(str(out_path))
    replace_zip_members(out_path, image_replacements)
    return out_path, spans
