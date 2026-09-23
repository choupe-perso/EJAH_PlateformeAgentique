# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Selects the right format handler module by file extension.

Each handler module exposes `inspect(path) -> list[Span]` and
`anonymize(path, vault, out_path=None) -> tuple[Path, list[Span]]`.
`text_handler`/`docx_handler`/`pptx_handler`/`xlsx_handler` additionally
expose `deanonymize(path, vault, out_path=None) -> Path` - text and
(where applicable) whole swapped-out images are restored exactly via the
same vault used to anonymize. `pdf_handler` doesn't: a PDF is converted
once into a plain .docx and anonymized as one (see pdf_handler's own
docstring for why) - the resulting .docx is what gets restored, via
docx_handler, like any other one."""
from __future__ import annotations

from pathlib import Path
from types import ModuleType

from app.tools.formats import (
    docx_handler,
    pdf_handler,
    pptx_handler,
    text_handler,
    xlsx_handler,
)

_HANDLERS: dict[str, ModuleType] = {
    ".txt": text_handler,
    ".docx": docx_handler,
    ".pptx": pptx_handler,
    ".xlsx": xlsx_handler,
    ".pdf": pdf_handler,
}


def get_handler(path: Path) -> ModuleType:
    handler = _HANDLERS.get(path.suffix.lower())
    if handler is None:
        supported = ", ".join(sorted(_HANDLERS))
        raise ValueError(f"Format non supporté : {path.suffix!r} (formats gérés : {supported})")
    return handler
