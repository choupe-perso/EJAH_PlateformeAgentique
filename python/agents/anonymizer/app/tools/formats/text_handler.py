# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Plain-text (.txt) handler - the original Phase 1 format, unchanged
behavior, just relocated out of cli.py so the CLI can dispatch by format."""
from __future__ import annotations

from pathlib import Path

from app.domain.engine import AnonymizationEngine, detect_only
from app.domain.span import Span
from app.domain.vault import Vault


def _read_text(path: Path) -> str:
    # newline="" disables Python's universal-newline translation, so
    # whatever line endings the file actually uses (\n, \r\n, mixed...)
    # come through byte-for-byte instead of always becoming "\n".
    with open(path, encoding="utf-8", newline="") as f:
        return f.read()


def _write_text(path: Path, text: str) -> None:
    # newline="" likewise stops Windows from translating every "\n" in
    # `text` into "\r\n" on write, which would silently corrupt an exact
    # round trip on a file that used plain LF endings to start with.
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)


def inspect(path: Path) -> list[Span]:
    return detect_only(_read_text(path))


def anonymize(path: Path, vault: Vault, out_path: Path | None = None) -> tuple[Path, list[Span]]:
    engine = AnonymizationEngine(vault)
    anonymized, spans = engine.anonymize(_read_text(path))
    out_path = out_path if out_path is not None else path.with_suffix(".anonymise.txt")
    _write_text(out_path, anonymized)
    return out_path, spans


def deanonymize(path: Path, vault: Vault, out_path: Path | None = None) -> Path:
    engine = AnonymizationEngine(vault)
    restored = engine.deanonymize(_read_text(path))
    out_path = out_path if out_path is not None else path.with_suffix(".restored.txt")
    _write_text(out_path, restored)
    return out_path
