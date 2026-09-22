# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Resolve overlapping spans produced by different recognizers.

Greedy interval scheduling: keep the highest-confidence span first, then
the highest-confidence span that doesn't overlap what's already kept, and
so on. Ties are broken by preferring the longer (more specific) span.
"""
from __future__ import annotations

from app.domain.span import Span


def merge_spans(spans: list[Span]) -> list[Span]:
    ordered = sorted(spans, key=lambda s: (-s.score, -(len(s))))
    selected: list[Span] = []
    for span in ordered:
        if not any(span.overlaps(kept) for kept in selected):
            selected.append(span)
    selected.sort(key=lambda s: s.start)
    return selected
