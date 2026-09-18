from __future__ import annotations

from typing import Protocol

from anonymizer.span import Span


class Recognizer(Protocol):
    """A recognizer scans a full text and returns every Span it finds.

    Implementations should not attempt to resolve overlaps with other
    recognizers - that is detection_dcp_060_fusion_chevauchements.py's job.
    """

    name: str

    def find(self, text: str) -> list[Span]: ...


def flex(pattern: str) -> str:
    """Turn every literal space in a multi-word trigger phrase / dictionary
    entry into `\\s+`, so it still matches when hard-wrapped plain text
    happens to word-wrap between two of those words (a real input - see
    the Histoire_N corpus - not just an edge case).

    Only safe to use on plain alternations of literal phrases with no
    character class containing a space (`[... ...]`) - those need to keep
    their literal space, so build them separately and don't run this over
    the whole compiled pattern."""
    return pattern.replace(" ", r"\s+")
