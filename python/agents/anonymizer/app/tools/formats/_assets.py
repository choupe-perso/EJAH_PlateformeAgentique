# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

_ASSETS_DIR = Path(__file__).parent / "assets"


@lru_cache(maxsize=1)
def placeholder_image_bytes() -> bytes:
    """The static image substituted for any embedded picture whose OCR'd
    text contains PII."""
    return (_ASSETS_DIR / "image_placeholder.png").read_bytes()
