"""Selects the right format handler module by file extension.

Each handler module exposes `inspect(path, avec_images=True) -> list[Span]`
and `anonymize(path, vault, out_path=None, avec_images=True) ->
tuple[Path, list[Span]]`. `avec_images` controls whether embedded images are
OCR'd for PII (docx/pptx/xlsx only - text_handler accepts and ignores it,
a .txt file never has images). `text_handler` additionally exposes
`deanonymize` - the docx/pptx/xlsx handlers deliberately don't (see the
project plan: restoring the original document isn't implemented for those
formats, only the vault's token -> value correspondence table is kept for
audit)."""
from __future__ import annotations

from pathlib import Path
from types import ModuleType

from anonymizer.formats import docx_handler, pptx_handler, text_handler, xlsx_handler

_HANDLERS: dict[str, ModuleType] = {
    ".txt": text_handler,
    ".docx": docx_handler,
    ".pptx": pptx_handler,
    ".xlsx": xlsx_handler,
}


def get_handler(path: Path) -> ModuleType:
    handler = _HANDLERS.get(path.suffix.lower())
    if handler is None:
        supported = ", ".join(sorted(_HANDLERS))
        raise ValueError(f"Format non supporté : {path.suffix!r} (formats gérés : {supported})")
    return handler
