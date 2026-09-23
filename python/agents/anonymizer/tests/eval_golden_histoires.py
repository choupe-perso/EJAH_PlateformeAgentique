"""Measure recall of the detection engine against the "Histoire_N" corpus
(see scripts/extract_golden_histoires.py), at the macro-category level
(the 5-color legend), by matching on normalized VALUE CONTENT rather than
character offsets.

Why content, not offsets: Histoire_N_source.txt is genuine hard-wrapped
plain text (word-wrapped at a column width, blank line = paragraph
break), while the golden spans are extracted from the differently-laid-out
.docx (one paragraph per line, plus a title/subtitle the .txt renders
differently). The two texts carry the same words but not the same
character offsets, so a golden value is looked up by its normalized text
(whitespace collapsed to single spaces) in the *bag* of detected spans'
normalized text for that story, rather than by position. Each golden
occurrence still needs its own matching detected occurrence (a Counter,
not just "does this text appear anywhere"), so a value mentioned 5 times
where the engine only caught 3 correctly shows 3/5, not 5/5.

Usage:
    python tests/eval_golden_histoires.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.domain.engine import detect_only  # noqa: E402
from app.domain.entities import macro_category  # noqa: E402

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"
_WS_RE = re.compile(r"\s+")


def normalize(text: str) -> str:
    return _WS_RE.sub(" ", text).strip()


def discover_cases() -> list[str]:
    cases = []
    for spans_path in sorted(FIXTURES_DIR.glob("histoire*_expected_macro_spans.json")):
        name = spans_path.name.removesuffix("_expected_macro_spans.json")
        source_path = FIXTURES_DIR / f"Histoire_{name.removeprefix('histoire')}_source.txt"
        if source_path.exists():
            cases.append(name)
    return cases


def _overlaps_as_text(a: str, b: str) -> bool:
    """True if the shorter normalized string is a substring of the
    longer one - a same-category detected span that only caught part of
    a multi-word golden phrase (or vice versa) still counts as a catch,
    mirroring the offset-overlap rule used for Format1-5/story2."""
    return a in b or b in a


def evaluate_case(name: str) -> dict:
    n = name.removeprefix("histoire")
    text = (FIXTURES_DIR / f"Histoire_{n}_source.txt").read_text(encoding="utf-8")
    golden = json.loads((FIXTURES_DIR / f"{name}_expected_macro_spans.json").read_text(encoding="utf-8"))

    detected = detect_only(text)
    # pool of (normalized_text, macro_category) still available to be
    # "claimed" by a golden entry, so a repeated value needs that many
    # independent detected occurrences, not just one match reused forever.
    pool: list[tuple[str, str]] = [
        (normalize(d.text), macro_category(d.entity_type).value) for d in detected
    ]

    total_golden = len(golden)
    total_hits = 0
    misses_by_macro: dict[str, int] = {}
    missed_values: list[str] = []
    for g in golden:
        g_text, g_macro = normalize(g["text"]), g["macro_category"]
        match_idx = next(
            (i for i, (d_text, d_macro) in enumerate(pool) if d_macro == g_macro and _overlaps_as_text(g_text, d_text)),
            None,
        )
        if match_idx is not None:
            total_hits += 1
            del pool[match_idx]
        else:
            misses_by_macro[g_macro] = misses_by_macro.get(g_macro, 0) + 1
            missed_values.append(f"{g_text!r} ({g_macro})")

    return {
        "case": name,
        "total_golden": total_golden,
        "total_hits": total_hits,
        "misses_by_macro": misses_by_macro,
        "missed_values": missed_values,
    }


def main() -> None:
    cases = discover_cases()
    total_golden = 0
    total_hits = 0
    all_misses: dict[str, int] = {}

    for name in cases:
        result = evaluate_case(name)
        total_golden += result["total_golden"]
        total_hits += result["total_hits"]
        recall = result["total_hits"] / result["total_golden"] if result["total_golden"] else 0
        print(f"{name}: recall={recall:.0%}  ({result['total_hits']}/{result['total_golden']})")
        if result["missed_values"]:
            for v in result["missed_values"]:
                print(f"    manqué: {v}")
        for macro, count in result["misses_by_macro"].items():
            all_misses[macro] = all_misses.get(macro, 0) + count

    print(f"\nRappel global (Histoire_N, niveau macro-catégorie) : {total_hits}/{total_golden} = {total_hits/total_golden:.0%}")
    if all_misses:
        print("\nRatés par macro-catégorie :")
        for macro, count in sorted(all_misses.items(), key=lambda kv: -kv[1]):
            print(f"  {macro}: {count}")


if __name__ == "__main__":
    main()
