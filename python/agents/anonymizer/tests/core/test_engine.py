# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
from app.domain.engine import (
    _propagate_person_names,
    _trim_leading_common_words,
    _trim_whitespace,
)
from app.domain.entities import EntityType
from app.domain.span import Span


def test_trim_whitespace_cuts_span_at_crlf_paragraph_break() -> None:
    text = "Mohamed M.\r\n\r\nBravo"
    span = Span(0, len(text), text, EntityType.PERSONNE, 0.7, "ner")
    trimmed = _trim_whitespace([span])
    assert len(trimmed) == 1
    assert trimmed[0].text == "Mohamed M."
    assert trimmed[0].end == 10


def test_trim_whitespace_cuts_span_at_lf_paragraph_break() -> None:
    text = "Mohamed M.\n\nBravo"
    span = Span(0, len(text), text, EntityType.PERSONNE, 0.7, "ner")
    trimmed = _trim_whitespace([span])
    assert trimmed[0].text == "Mohamed M."


def test_propagate_person_names_is_case_insensitive() -> None:
    text = "Bonjour Lara, à vous lara."
    seed = Span(8, 12, "Lara", EntityType.PERSONNE, 0.7, "ner")
    propagated = _propagate_person_names(text, [seed])
    lowercase_matches = [s for s in propagated if s.text == "lara"]
    assert len(lowercase_matches) == 1
    match = lowercase_matches[0]
    # Span.text doit correspondre exactement a text[start:end] (voir
    # Span), meme si Vault fusionnera ensuite les deux casses sur un seul
    # jeton (voir tests/core/test_vault.py).
    assert text[match.start : match.end] == "lara"


def test_trim_leading_common_words_strips_glued_greeting() -> None:
    text = "merci mohammmed"
    span = Span(0, len(text), text, EntityType.PERSONNE, 0.7, "ner")
    trimmed = _trim_leading_common_words([span])
    assert trimmed[0].text == "mohammmed"
    assert trimmed[0].start == len("merci ")
    assert trimmed[0].end == span.end


def test_trim_leading_common_words_ignores_non_person_spans() -> None:
    text = "chez ANSM"
    span = Span(0, len(text), text, EntityType.EMPLOYEUR, 0.7, "organisme")
    trimmed = _trim_leading_common_words([span])
    assert trimmed[0].text == "chez ANSM"


def test_trim_leading_common_words_leaves_span_alone_without_common_prefix() -> None:
    text = "Mohamed M."
    span = Span(0, len(text), text, EntityType.PERSONNE, 0.7, "ner")
    trimmed = _trim_leading_common_words([span])
    assert trimmed[0].text == "Mohamed M."
