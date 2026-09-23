# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""DOCX/PPTX/XLSX are all OOXML packages (a zip of XML parts). None of
python-docx, python-pptx or openpyxl expose a public way to change an
embedded image's raw bytes in place - so image replacement is done as a
post-processing pass directly on the saved zip: rebuild it, copying every
member unchanged except the targeted media parts (`word/media/imageN.*`,
`ppt/media/imageN.*`, `xl/media/imageN.*`)."""
from __future__ import annotations

import zipfile
from pathlib import Path


def replace_zip_members(path: str | Path, replacements: dict[str, bytes]) -> None:
    """Rewrite the zip at `path` in place, substituting the bytes of every
    member named in `replacements` (member name -> new bytes) and copying
    every other member through unchanged. No-op if `replacements` is
    empty."""
    if not replacements:
        return

    path = Path(path)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with zipfile.ZipFile(path) as src, zipfile.ZipFile(
        tmp_path, "w", zipfile.ZIP_DEFLATED
    ) as dst:
        for item in src.infolist():
            data = replacements.get(item.filename, None)
            if data is None:
                data = src.read(item.filename)
            dst.writestr(item, data)

    tmp_path.replace(path)
