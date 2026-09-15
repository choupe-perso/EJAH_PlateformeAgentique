"""The format-independent anonymization engine: plain text in, plain text
with tokens out (and back).

Design note on pseudonym consistency: a token is keyed on the exact
literal value it replaces (via Vault's blind index), so the same string
occurring twice always gets the same token, and deanonymize() is always an
exact inverse. This intentionally does NOT try to resolve a first-name
mention ("Élodie") to a previously seen full name ("Élodie Vasseur") into
one shared token - doing so would make deanonymize() lossy (it could only
ever restore one of the two original strings). Coreference across partial
mentions is left as a possible future improvement built on top of, not
inside, the reversible core.
"""
from __future__ import annotations

import re

from anonymizer.entities import EntityType
from anonymizer.recognizers import Recognizer, default_recognizers, merge_spans
from anonymizer.span import Span
from anonymizer.vault import Vault

_TOKEN_RE = re.compile(r"\[[A-Z_]+_\d+\]")
_PARAGRAPH_BREAK_RE = re.compile(r"\n[ \t]*\n")


def _trim_whitespace(spans: list[Span]) -> list[Span]:
    """Recognizers are expected to return tight spans, but e.g. spaCy's NER
    has been observed to occasionally over-extend an entity's boundaries
    across a paragraph break (a blank line) into unrelated following text
    - typically with short/unusual paragraphs (a title line, an
    image-only paragraph, ...). Replacing such a span with a token would
    silently delete or merge unrelated text, breaking the round trip - so
    truncate any span at the first paragraph break (two-or-more
    newlines), then trim ordinary whitespace.

    A *single* embedded newline is deliberately left alone: hard-wrapped
    plain text (a value word-wrapped mid-sentence at some column width)
    is a legitimate input, and every recognizer already matches
    whitespace-tolerantly (`\\s`/`\\s+`), so a value split across one
    soft line-wrap is still detected whole and should stay whole here
    too."""
    trimmed = []
    for s in spans:
        text = s.text
        break_match = _PARAGRAPH_BREAK_RE.search(text)
        if break_match:
            text = text[: break_match.start()]
        stripped = text.strip()
        if not stripped:
            continue
        lead = len(text) - len(text.lstrip())
        new_start = s.start + lead
        new_end = new_start + len(stripped)
        if new_start == s.start and new_end == s.end:
            trimmed.append(s)
        else:
            trimmed.append(Span(new_start, new_end, stripped, s.entity_type, s.score, s.source))
    return trimmed


def _propagate_person_names(text: str, spans: list[Span]) -> list[Span]:
    """Statistical NER on repeated proper nouns is inconsistent - the same
    name is sometimes missed depending on its syntactic context. Once a
    name has been recognized as PERSONNE anywhere in the document, tag
    every other exact whole-word occurrence of it too."""
    known_names = {s.text for s in spans if s.entity_type == EntityType.PERSONNE}
    extra: list[Span] = []
    for name in known_names:
        if len(name) < 3:
            continue
        for m in re.finditer(r"\b" + re.escape(name) + r"\b", text):
            already_person = any(
                m.start() < s.end and s.start < m.end() and s.entity_type == EntityType.PERSONNE
                for s in spans + extra
            )
            if already_person:
                continue
            # Score above the NER recognizer's own 0.7 baseline: a name
            # already confirmed elsewhere in the document as a person is
            # stronger evidence than a fresh (and possibly mislabeled,
            # e.g. tagged LOC/ORG) NER guess at this particular spot.
            extra.append(
                Span(m.start(), m.end(), name, EntityType.PERSONNE, 0.75, "name_propagation")
            )
    return spans + extra


def detect_only(text: str, recognizers: list[Recognizer] | None = None) -> list[Span]:
    """Run detection without a vault - for dry-run inspection."""
    recognizers = recognizers if recognizers is not None else default_recognizers()
    all_spans: list[Span] = []
    for recognizer in recognizers:
        all_spans.extend(recognizer.find(text))
    all_spans = _trim_whitespace(all_spans)
    merged = merge_spans(all_spans)
    merged = _propagate_person_names(text, merged)
    return merge_spans(merged)


class AnonymizationEngine:
    def __init__(self, vault: Vault, recognizers: list[Recognizer] | None = None) -> None:
        self.vault = vault
        self.recognizers = recognizers if recognizers is not None else default_recognizers()

    def detect(self, text: str) -> list[Span]:
        return detect_only(text, self.recognizers)

    def anonymize(self, text: str) -> tuple[str, list[Span]]:
        spans = self.detect(text)
        pieces: list[str] = []
        cursor = 0
        for span in spans:
            pieces.append(text[cursor : span.start])
            token = self.vault.tokenize(span.entity_type, span.text)
            pieces.append(token)
            cursor = span.end
        pieces.append(text[cursor:])
        return "".join(pieces), spans

    def deanonymize(self, text: str) -> str:
        def _replace(match: re.Match) -> str:
            token = match.group(0)
            original = self.vault.resolve(token)
            return original if original is not None else token

        return _TOKEN_RE.sub(_replace, text)
