# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
from app.domain.entities import EntityType
from app.domain.span import Span


def test_span_length_matches_text_slice_size() -> None:
    span = Span(0, 5, "Alice", EntityType.PERSONNE, 0.9, "test")
    assert len(span) == 5


def test_span_overlaps_detects_intersection() -> None:
    a = Span(0, 10, "0123456789", EntityType.PERSONNE, 0.9, "test")
    b = Span(5, 15, "56789xxxxx", EntityType.PERSONNE, 0.9, "test")
    c = Span(10, 20, "xxxxxxxxxx", EntityType.PERSONNE, 0.9, "test")
    assert a.overlaps(b) is True
    assert a.overlaps(c) is False


def test_span_merge_resolves_overlaps() -> None:
    from app.domain.recognizers import merge_spans

    a = Span(0, 10, "0123456789", EntityType.PERSONNE, 0.6, "low")
    b = Span(2, 8, "234567", EntityType.PERSONNE, 0.95, "high")
    merged = merge_spans([a, b])
    assert merged == [b]
