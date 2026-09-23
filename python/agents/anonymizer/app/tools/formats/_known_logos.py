# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Exact-byte fingerprints of organizational logo images confirmed to
defeat OCR entirely - not a general fallback, only a targeted patch for
images already investigated and found unreadable.

Investigated case: ANSM's own wordmark (a 2025-194 CRT/CCTP document's
header banner and footer icon). RapidOCR's detector finds zero text boxes
in the header banner even after disabling its width/height-ratio bypass
and forcing the whole-image recognition path directly (the extremely
bold, geometric letterforms don't read as text to the model at all); the
footer icon is small enough to already skip detection by default but its
recognition output is garbage ("wsUe"). Tuning OCR parameters further
didn't help either image - this is a model limitation on a highly
stylized logotype, not a preprocessing bug.

Since the same client's template reuses the identical image bytes across
every document, fingerprinting once and matching by SHA-256 is more
reliable here than continuing to chase OCR. This only ever matches a
byte-identical image (re-exporting/re-compressing the source file would
change the hash) - it is not a substitute for OCR, just a documented,
extensible patch for specific images already confirmed to defeat it. Add
a new hash below when another client's logo is found to have the same
problem.
"""
from __future__ import annotations

import hashlib

KNOWN_LOGO_SHA256: frozenset[str] = frozenset(
    {
        # ANSM header banner, word/media/image5.png (2025-194 CRT/CCTP)
        "c54fced9ead94562efcef30975339afbda0cd3f420be3926205fcd7fa4b311b0",
        # ANSM footer icon, word/media/image8.png (2025-194 CRT/CCTP)
        "c0da026616e42b925208dbe811c60284aadf0beb1f967f2a01af152ff0f67b8e",
    }
)


def is_known_logo(image_bytes: bytes) -> bool:
    return hashlib.sha256(image_bytes).hexdigest() in KNOWN_LOGO_SHA256
