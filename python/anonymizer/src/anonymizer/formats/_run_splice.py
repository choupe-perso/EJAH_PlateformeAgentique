"""Shared detect+splice algorithm for run-based text models (DOCX
paragraphs, PPTX text frames): an entity can be split across several runs
by a formatting boundary (bold vs. plain, a spell-check break...), so
detection has to run on a paragraph's full joined text and the resulting
span then has to be spliced back across whichever runs it touches.

Not used for XLSX: an Excel cell is a single atomic string with no run
splitting to worry about, so xlsx_handler replaces cell.value directly.

No inverse ("un-splice") direction exists here - restoring the original
document isn't implemented for docx/pptx (see the project plan); the
vault's token -> value table is the audit trail.
"""
from __future__ import annotations

from typing import Protocol, Sequence

from anonymizer.engine import detect_only
from anonymizer.span import Span
from anonymizer.vault import Vault

_BLOCK_JOIN = "\n\n"


class RunLike(Protocol):
    text: str


def _build_segments(
    paragraphs: Sequence[Sequence[RunLike]],
) -> tuple[str, list[tuple[int, int, int, int]]]:
    """Join every paragraph's run texts into one string, separating
    paragraphs with `_BLOCK_JOIN`. A real paragraph break is always a hard
    break in DOCX/PPTX (never a soft mid-sentence wrap), so joining with
    "\\n\\n" makes every paragraph boundary match engine.py's
    `_PARAGRAPH_BREAK_RE`, which `detect_only` already uses to stop a span
    from ever crossing one - no changes to engine.py needed.

    Returns (full_text, segments), where each segment is
    (paragraph_index, run_index, start, end) - the run's exact offset
    range within full_text. Empty runs are omitted (they own no offset
    range to splice into)."""
    segments: list[tuple[int, int, int, int]] = []
    pieces: list[str] = []
    offset = 0
    for p_idx, runs in enumerate(paragraphs):
        for r_idx, run in enumerate(runs):
            text = run.text or ""
            if text:
                segments.append((p_idx, r_idx, offset, offset + len(text)))
                pieces.append(text)
                offset += len(text)
        pieces.append(_BLOCK_JOIN)
        offset += len(_BLOCK_JOIN)
    return "".join(pieces), segments


def detect_in_paragraphs(paragraphs: Sequence[Sequence[RunLike]]) -> list[Span]:
    """Read-only detection (for `inspect`) - uses the exact same joining
    as `replace_in_paragraphs` so the two never disagree on what's found."""
    full_text, _ = _build_segments(paragraphs)
    return detect_only(full_text)


def replace_in_paragraphs(paragraphs: Sequence[Sequence[RunLike]], vault: Vault) -> list[Span]:
    """Detects every PII span across the whole document (so cross-
    paragraph name propagation - see engine._propagate_person_names -
    still works) and replaces each one with a vault token, splicing across
    however many runs the span touches while leaving every run's own
    formatting untouched. Returns the spans that were found."""
    full_text, segments = _build_segments(paragraphs)
    spans = detect_only(full_text)

    # Reverse start order: for any run touched by more than one span,
    # this guarantees we always splice the rightmost span in that run
    # first, so an earlier span's local offsets within the same run are
    # never invalidated by a later mutation.
    for span in sorted(spans, key=lambda s: s.start, reverse=True):
        touched = [seg for seg in segments if seg[2] < span.end and span.start < seg[3]]
        if not touched:
            # Shouldn't happen - detect_only never returns a span that
            # crosses a "\n\n" block boundary - but skip rather than
            # tokenize a value that ends up nowhere in the document.
            continue

        token = vault.tokenize(span.entity_type, span.text)
        for i, (p_idx, r_idx, seg_start, seg_end) in enumerate(touched):
            run = paragraphs[p_idx][r_idx]
            local_start = max(span.start, seg_start) - seg_start
            local_end = min(span.end, seg_end) - seg_start
            text = run.text
            if i == 0:
                run.text = text[:local_start] + token + text[local_end:]
            else:
                run.text = text[:local_start] + text[local_end:]

    return spans
