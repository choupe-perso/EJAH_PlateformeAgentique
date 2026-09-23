"""Regenerate tests/fixtures/histoireN_expected_macro_spans.json for every
"Histoire_N_source.txt" + "Histoire_N_categories_couleur*.docx" pair found
in tests/fixtures/ (auto-discovered - no per-story hand-curated category
table needed, unlike Format1-5/story2).

Ground truth here is at the macro-category level only (the 5-color
legend: Identite & contact / Identifiants officiels / Sante / Sensibles
RGPD art.9 & judiciaire / Pro & numerique - see
anonymizer.entities.MacroCategory), since that's what the color-coding
actually encodes. Files named "manuel_*" are the user's own manual test
material and are always skipped.

Usage:
    python scripts/extract_golden_histoires.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from extract_golden_from_docx import merge_adjacent_spans, read_xml  # noqa: E402

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "tests" / "fixtures"

COLOR_TO_MACRO = {
    "1F4E96": "IDENTITE_CONTACT",
    "C00000": "IDENTIFIANTS_OFFICIELS",
    "2E7D32": "SANTE",
    "7030A0": "SENSIBLE_JUDICIAIRE",
    "E36C09": "PRO_NUMERIQUE",
}


def is_legend_paragraph(text: str) -> bool:
    return "■" in text


def extract_spans_with_macro(xml: str):
    """Re-implements the run walk from paragraphs_with_spans, but records
    the macro-category for each span instead of a placeholder."""
    from extract_golden_from_docx import W_P, W_R, W_T, W_BOLD, W_COLOR
    import html as html_mod

    para_texts = []
    spans = []
    offset = 0
    for p in W_P.findall(xml):
        para_chunks = []
        for r in W_R.findall(p):
            t_match = W_T.search(r)
            if not t_match:
                continue
            text = html_mod.unescape(t_match.group(1))
            is_bold = bool(W_BOLD.search(r))
            color_match = W_COLOR.search(r)
            color = color_match.group(1).upper() if color_match else None
            start = offset + sum(len(c) for c in para_chunks)
            para_chunks.append(text)
            if is_bold and color in COLOR_TO_MACRO:
                spans.append((start, start + len(text), text, COLOR_TO_MACRO[color]))
        para_text = "".join(para_chunks)
        para_texts.append(para_text)
        offset += len(para_text) + 1
    return para_texts, spans


def process_pair(source_path: Path, annotated_path: Path, out_name: str) -> None:
    # the reconstructed annotated text below never ends with "\n" (plain
    # "\n".join of paragraphs), so strip a trailing newline here too.
    source_text = source_path.read_text(encoding="utf-8").rstrip("\n")
    source_paras = source_text.split("\n")

    annotated_xml = read_xml(annotated_path, "word/document.xml")
    annotated_paras_raw, raw_spans = extract_spans_with_macro(annotated_xml)

    kept_paras = []
    shift = 0
    cursor = 0
    adjusted = []
    for para in annotated_paras_raw:
        para_len = len(para) + 1
        if is_legend_paragraph(para):
            shift += para_len
        else:
            kept_paras.append(para)
            for start, end, text, macro in raw_spans:
                if cursor <= start < cursor + para_len:
                    adjusted.append((start - shift, end - shift, text, macro))
        cursor += para_len
    annotated_text = "\n".join(kept_paras)

    if annotated_text != source_text:
        print(f"[WARN] {out_name}: source/annotated text differ after removing the legend.")
        for i, (a, b) in enumerate(zip(source_paras, kept_paras)):
            if a != b:
                print(f"  paragraph {i} differs:\n    source : {a!r}\n    couleur: {b!r}")

    class _S:
        __slots__ = ("start", "end", "text", "category")

        def __init__(self, start, end, text, category):
            self.start, self.end, self.text, self.category = start, end, text, category

    span_objs = [_S(*t) for t in adjusted]
    merged = merge_adjacent_spans(annotated_text, span_objs)

    golden = [
        {"start": s.start, "end": s.end, "text": s.text, "macro_category": s.category}
        for s in merged
    ]
    (FIXTURES_DIR / f"{out_name}_expected_macro_spans.json").write_text(
        json.dumps(golden, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"{out_name}: {len(golden)} spans -> fixtures written")


def discover_pairs():
    pairs = []
    for source_path in sorted(FIXTURES_DIR.glob("Histoire_*_source.txt")):
        m = re.match(r"Histoire_(\d+)_source\.txt", source_path.name)
        if not m:
            continue
        n = m.group(1)
        candidates = sorted(FIXTURES_DIR.glob(f"Histoire_{n}_categories_couleur*.docx"))
        if not candidates:
            print(f"[SKIP] Histoire_{n}: no categories_couleur docx found")
            continue
        pairs.append((source_path, candidates[-1], f"histoire{n}"))
    return pairs


def main() -> None:
    for source_path, annotated_path, out_name in discover_pairs():
        process_pair(source_path, annotated_path, out_name)


if __name__ == "__main__":
    main()
