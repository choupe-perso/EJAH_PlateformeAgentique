# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""The format-independent anonymization engine: plain text in, plain text
with tokens out (and back).

Design note on pseudonym consistency: a token is keyed on the entity type
and the case-insensitively normalized value it replaces (via Vault's
blind index - see Vault.tokenize()), so "Lara" and "lara" share one
token. This makes deanonymize() lossy on the casing of whichever
occurrence wasn't tokenized first for that value: resolve() always
returns the first-seen casing, even for a later occurrence that had a
different one. That trade-off is deliberate - one consistent, readable
token per real-world value, rather than a per-occurrence exact round
trip - and was chosen over exact-casing fidelity after review.

This does NOT extend to resolving a first-name mention ("Élodie") to a
previously seen full name ("Élodie Vasseur") into one shared token - that
remains a genuinely different literal value, not a casing variant of the
same one; merging those would need real coreference resolution, left as a
possible future improvement built on top of, not inside, the reversible
core.
"""
from __future__ import annotations

import re

from app.domain.entities import EntityType
from app.domain.recognizers import Recognizer, default_recognizers, merge_spans
from app.domain.span import Span
from app.domain.vault import Vault

_TOKEN_RE = re.compile(r"\[[A-Z_]+_\d+\]")
# \r?\n couvre LF (Unix) et CRLF (Windows) ; un fichier .txt cree/edite
# sous Windows utilise quasi toujours CRLF, et un "\n[ \t]*\n" nu ne
# reconnaissait alors jamais un saut de paragraphe - un span NER pouvait
# alors deborder sur tout un paragraphe suivant sans etre coupe (voir
# _trim_whitespace ci-dessous).
_PARAGRAPH_BREAK_RE = re.compile(r"\r?\n[ \t]*\r?\n")

# Mots courants que le NER de spaCy colle parfois au debut d'un span
# PERSONNE (ex. "merci mohammmed" reconnu comme une seule entite). Liste
# volontairement courte et prudente (formules de politesse/civilite
# frequentes en tete de phrase ou de message) pour limiter le risque de
# retirer par erreur un veritable debut de nom compose.
_LEADING_COMMON_WORDS = {
    "bonjour", "bonsoir", "salut", "merci", "cher", "chere", "chère",
    "chers", "cheres", "chères", "monsieur", "madame", "mademoiselle",
    "cordialement",
}
_LEADING_WORD_RE = re.compile(r"^([A-Za-zÀ-ÿ]+)([ \t]+)(?=\S)")

# Common French possessive determiners that spaCy's NER has been observed
# to mistake for a person's name when capitalized at the start of a
# sentence/quote (e.g. "Ton compte a été utilisé..."). Never usable as a
# _propagate_person_names seed: propagating one turns every ordinary
# occurrence of "ton"/"ta"/... anywhere else in the document (extremely
# common words) into a PERSONNE token too.
_NEVER_PERSON_NAMES = {
    "ton", "ta", "tes", "mon", "ma", "mes", "son", "sa", "ses",
    "notre", "votre", "leur", "nos", "vos", "leurs",
}


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


def _trim_leading_common_words(spans: list[Span]) -> list[Span]:
    """Same idea as _trim_whitespace, at word level instead of paragraph
    level: spaCy's NER has been observed to occasionally glue a common
    French word onto the front of a PERSONNE span ("merci mohammmed"
    tagged as one entity instead of "merci" being ordinary text followed
    by the name). Strip a single leading word from _LEADING_COMMON_WORDS,
    once, so it stays out of the anonymized token instead of silently
    vanishing along with it. Only applied to PERSONNE - a word like
    "chez" happens to be common before an EMPLOYEUR/ADRESSE span but
    trimming there isn't the failure mode this was written for."""
    trimmed = []
    for s in spans:
        if s.entity_type != EntityType.PERSONNE:
            trimmed.append(s)
            continue
        m = _LEADING_WORD_RE.match(s.text)
        if m and m.group(1).casefold() in _LEADING_COMMON_WORDS:
            new_start = s.start + m.end()
            new_text = s.text[m.end() :]
            trimmed.append(Span(new_start, s.end, new_text, s.entity_type, s.score, s.source))
        else:
            trimmed.append(s)
    return trimmed


def _drop_blocked_person_spans(spans: list[Span]) -> list[Span]:
    """Drop a PERSONNE span outright when its exact text is a common
    possessive determiner (see _NEVER_PERSON_NAMES) - a wrong NER guess at
    its own position, not just a bad seed for propagation."""
    return [
        s
        for s in spans
        if not (s.entity_type == EntityType.PERSONNE and s.text.casefold() in _NEVER_PERSON_NAMES)
    ]


def _propagate_person_names(text: str, spans: list[Span]) -> list[Span]:
    """Statistical NER on repeated proper nouns is inconsistent - the same
    name is sometimes missed depending on its syntactic context. Once a
    name has been recognized as PERSONNE anywhere in the document, tag
    every other whole-word occurrence of it too, case-insensitively (a
    name re-typed in a different case, e.g. "Lara" then "lara", is still
    the same detection-worthy word).

    Each propagated span keeps its OWN actual text (`m.group(0)`, not the
    seed's casing) rather than being forced to the seed's exact spelling -
    Span.text must equal text[start:end] (see Span's docstring). Vault
    still ends up giving every casing variant the same token (its blind
    index is case-insensitive, see Vault.tokenize()); keeping the real
    per-occurrence text here only matters for whichever occurrence is
    tokenized first, since that is the casing resolve() will later
    return for the whole group."""
    known_names = {
        s.text
        for s in spans
        if s.entity_type == EntityType.PERSONNE
        and s.text.casefold() not in _NEVER_PERSON_NAMES
    }
    extra: list[Span] = []
    for name in known_names:
        if len(name) < 3:
            continue
        for m in re.finditer(r"\b" + re.escape(name) + r"\b", text, re.IGNORECASE):
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
                Span(m.start(), m.end(), m.group(0), EntityType.PERSONNE, 0.75, "name_propagation")
            )
    return spans + extra


def _propagate_exact_repeats(
    text: str, spans: list[Span], entity_type: EntityType
) -> list[Span]:
    """Some values get restated verbatim later in a document without the
    trigger phrase a context recognizer needs the first time (e.g. a
    birth date first caught via "né le X", then simply repeated as "sa
    naissance au X" further down). Once such a value has been recognized
    anywhere, tag every other exact (case-sensitive - unlike person names,
    these values don't have meaningful casing variants) occurrence of it
    too."""
    known_values = {s.text for s in spans if s.entity_type == entity_type}
    extra: list[Span] = []
    for value in known_values:
        for m in re.finditer(re.escape(value), text):
            already = any(
                m.start() < s.end and s.start < m.end() and s.entity_type == entity_type
                for s in spans + extra
            )
            if already:
                continue
            extra.append(
                Span(m.start(), m.end(), m.group(0), entity_type, 0.9, "value_propagation")
            )
    return spans + extra


def detect_only(text: str, recognizers: list[Recognizer] | None = None) -> list[Span]:
    """Run detection without a vault - for dry-run inspection."""
    recognizers = recognizers if recognizers is not None else default_recognizers()
    all_spans: list[Span] = []
    for recognizer in recognizers:
        all_spans.extend(recognizer.find(text))
    all_spans = _trim_whitespace(all_spans)
    all_spans = _trim_leading_common_words(all_spans)
    all_spans = _drop_blocked_person_spans(all_spans)
    merged = merge_spans(all_spans)
    merged = _propagate_person_names(text, merged)
    merged = _propagate_exact_repeats(text, merged, EntityType.DATE_NAISSANCE)
    merged = _propagate_exact_repeats(text, merged, EntityType.MOT_DE_PASSE)
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
