# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
from __future__ import annotations

from dataclasses import dataclass

from app.domain.entities import EntityType


@dataclass(frozen=True)
class Span:
    """A detected entity occurrence in a text.

    `start`/`end` are character offsets into the text the recognizer ran on
    (Python slice semantics: text[start:end] == text_value).
    `score` is a 0-1 confidence used by detection_dcp_060_fusion_chevauchements.py to resolve overlaps.
    `source` names the recognizer that produced the span, for debugging.
    """

    start: int
    end: int
    text: str
    entity_type: EntityType
    score: float
    source: str

    def __len__(self) -> int:
        return self.end - self.start

    def overlaps(self, other: "Span") -> bool:
        return self.start < other.end and other.start < self.end
