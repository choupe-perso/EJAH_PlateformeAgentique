"""Measure recall/precision of the detection engine against the example
.docx use cases: Format1-5 (see scripts/extract_golden_from_docx.py) and
story2 (see scripts/extract_golden_story2.py, an out-of-sample second
story used to catch overfitting to the first one).

A detected span "hits" a golden span if they overlap (character ranges
intersect) - we don't require exact boundary equality, since e.g. catching
"Clermont-Ferrand (Puy-de-Dôme)" vs "Clermont-Ferrand" is still a useful
catch even if the boundary differs slightly. Category is compared too.

Usage:
    python tests/eval_golden_corpus.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.domain.engine import detect_only  # noqa: E402

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def overlaps(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
    return a_start < b_end and b_start < a_end


def evaluate_case(case: str) -> dict:
    text = (FIXTURES_DIR / f"{case}_source.txt").read_text(encoding="utf-8")
    golden = json.loads((FIXTURES_DIR / f"{case}_expected_spans.json").read_text(encoding="utf-8"))

    detected = detect_only(text)

    hits = []
    misses = []
    for g in golden:
        match = next(
            (
                d
                for d in detected
                if overlaps(g["start"], g["end"], d.start, d.end)
                and d.entity_type.value == g["category"]
            ),
            None,
        )
        if match is not None:
            hits.append(g)
        else:
            misses.append(g)

    matched_detected_ids = set()
    for g in golden:
        for i, d in enumerate(detected):
            if overlaps(g["start"], g["end"], d.start, d.end) and d.entity_type.value == g["category"]:
                matched_detected_ids.add(i)
                break
    false_positives = [d for i, d in enumerate(detected) if i not in matched_detected_ids]

    return {
        "case": case,
        "golden_count": len(golden),
        "hits": hits,
        "misses": misses,
        "detected_count": len(detected),
        "false_positives": false_positives,
    }


CASES = [f"format{n}" for n in range(1, 6)] + ["story2"]


def main() -> None:
    total_golden = 0
    total_hits = 0
    per_category_misses: dict[str, int] = {}

    for case in CASES:
        result = evaluate_case(case)
        total_golden += result["golden_count"]
        total_hits += len(result["hits"])
        recall = len(result["hits"]) / result["golden_count"] if result["golden_count"] else 0
        print(
            f"{case}: recall={recall:.0%}  "
            f"({len(result['hits'])}/{result['golden_count']} golden hit, "
            f"{result['detected_count']} spans détectés au total, "
            f"{len(result['false_positives'])} hors golden set)"
        )
        for m in result["misses"]:
            per_category_misses[m["category"]] = per_category_misses.get(m["category"], 0) + 1

    print(f"\nRappel global : {total_hits}/{total_golden} = {total_hits/total_golden:.0%}")
    if per_category_misses:
        print("\nRatés par catégorie :")
        for cat, count in sorted(per_category_misses.items(), key=lambda kv: -kv[1]):
            print(f"  {cat}: {count}")


if __name__ == "__main__":
    main()
