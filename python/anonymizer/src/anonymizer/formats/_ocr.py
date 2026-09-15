"""Shared OCR access for image PII detection (DOCX/PPTX/XLSX).

RapidOCR loads its ONNX models on first use, which takes real time - the
engine is built lazily and cached so a run that never touches an image
(a .txt file, an image-free .xlsx...) never pays that cost."""
from __future__ import annotations

from functools import lru_cache


@lru_cache(maxsize=1)
def _engine():
    from rapidocr_onnxruntime import RapidOCR

    return RapidOCR()


def image_text(image_bytes: bytes) -> str:
    """Best-effort OCR: the recognized text (one line per detected text
    box), or "" if the bytes aren't a readable image or nothing was
    recognized."""
    try:
        result, _ = _engine()(image_bytes)
    except Exception:
        return ""
    if not result:
        return ""
    return "\n".join(line[1] for line in result)
