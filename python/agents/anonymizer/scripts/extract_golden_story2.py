"""Regenerate tests/fixtures/story2_* from the second example story
("Thomas Lefebvre" / Histoire_2), annotated with a 5-color legend instead
of a single red highlight:

    1F4E96 blue   = Identite & contact
    C00000 red    = Identifiants officiels
    2E7D32 green  = Sante
    7030A0 purple = Sensibles (RGPD art. 9) & judiciaire
    E36C09 orange = Pro & numerique

Usage:
    python scripts/extract_golden_story2.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from extract_golden_from_docx import (  # noqa: E402
    merge_adjacent_spans,
    paragraphs_plain_text,
    paragraphs_with_spans,
    read_xml,
)

RESOURCES_DIR = Path(
    r"D:\IA_Archi2026\IALocalPortableCHO\LocalClaudeProjects\ToolkitIA"
    r"\900_Ressources\Anonymisation"
)
FIXTURES_DIR = Path(__file__).resolve().parent.parent / "tests" / "fixtures"

SOURCE_PATH = RESOURCES_DIR / "Histoire_2_source.docx"
ANNOTATED_PATH = RESOURCES_DIR / "Histoire_2_categories_couleur.docx"

PALETTE = {"1F4E96", "C00000", "2E7D32", "7030A0", "E36C09"}

CATEGORY_BY_VALUE = [
    ("Thomas Lefebvre — Cybersécurité & Risques", "RESEAU_SOCIAL"),
    ("Nantes (Loire-Atlantique)", "LIEU_NAISSANCE"),
    ("12 rue de la Paix, 44000 Nantes", "ADRESSE"),
    ("45 avenue Thiers, 33000 Bordeaux", "ADRESSE"),
    ("FR14 2004 1010 0505 0001 3M02 606", "IBAN"),
    ("Banque Populaire Atlantique", "BANQUE"),
    ("allergie sévère aux fruits à coque", "SANTE"),
    ("suspension de permis de trois mois", "CASIER_JUDICIAIRE"),
    ("conduite en état d’ivresse", "CASIER_JUDICIAIRE"),
    ("conduite en état d'ivresse", "CASIER_JUDICIAIRE"),
    ("sympathisant du parti socialiste", "OPINION_POLITIQUE"),
    ("1 82 07 44 512 036 78", "NIR"),
    ("adhérent de la CGT", "SYNDICAT"),
    ("marié à un homme", "ORIENTATION_SEXUELLE"),
    ("traité par insuline", "SANTE"),
    ("diabète de type 2", "SANTE"),
    ("9 juillet 1982", "DATE_NAISSANCE"),
    ("06 58 22 41 79", "TELEPHONE"),
    ("06 40 17 58 22", "TELEPHONE"),
    ("thomas.lefebvre82@outlook.fr", "EMAIL"),
    ("nadia.cherkaoui@gmail.com", "EMAIL"),
    ("origine portugaise", "ORIGINE"),
    ("Marc Delannoy", "PERSONNE"),
    ("Karim Belhadj", "PERSONNE"),
    ("Nadia Cherkaoui", "PERSONNE"),
    ("3 mai 1986", "DATE_NAISSANCE"),
    ("Solstice Numérique", "EMPLOYEUR"),
    ("consultant senior", "POSTE"),
    ("58 000 euros", "SALAIRE"),
    ("81.253.44.109", "IP"),
    ("665847213099", "CNI"),
    ("14RN73820", "PASSEPORT"),
    ("EH-719-BM", "PLAQUE"),
    ("Rennes2026$Init", "MOT_DE_PASSE"),
    ("@tlefebvre_sec", "RESEAU_SOCIAL"),
    ("sans religion", "RELIGION"),
    ("t.lefebvre", "IDENTIFIANT"),
    ("Bordeaux", "LIEU_NAISSANCE"),
    ("Thomas Lefebvre", "PERSONNE"),
    ("Nadia Cherkaoui", "PERSONNE"),
    ("Hugo", "PERSONNE"),
    ("Nicolas", "PERSONNE"),
    ("Thomas", "PERSONNE"),
]


def categorize(value: str) -> str:
    normalized = value.strip()
    for known_value, category in CATEGORY_BY_VALUE:
        if normalized == known_value:
            return category
    return "INCONNU"


def is_legend_paragraph(text: str) -> bool:
    return "■" in text


def main() -> None:
    source_xml = read_xml(SOURCE_PATH, "word/document.xml")
    annotated_xml = read_xml(ANNOTATED_PATH, "word/document.xml")

    source_paras = [p for p in paragraphs_plain_text(source_xml) if not is_legend_paragraph(p)]
    source_text = "\n".join(source_paras)

    annotated_paras, raw_spans = paragraphs_with_spans(annotated_xml, PALETTE)
    # drop the legend paragraph and shift span offsets accordingly
    kept_paras = []
    offset = 0
    shift = 0
    adjusted_spans = []
    cursor = 0
    for para in annotated_paras:
        para_len = len(para) + 1  # + "\n"
        if is_legend_paragraph(para):
            shift += para_len
        else:
            kept_paras.append(para)
            for s in raw_spans:
                if cursor <= s.start < cursor + para_len:
                    adjusted_spans.append(
                        type(s)(s.start - shift, s.end - shift, s.text, s.category)
                    )
        cursor += para_len
    annotated_text = "\n".join(kept_paras)

    if annotated_text != source_text:
        print("[WARN] story2: source and annotated body text differ after removing the legend.")
        for i, (a, b) in enumerate(zip(source_paras, kept_paras)):
            if a != b:
                print(f"  paragraph {i} differs:\n    source : {a!r}\n    couleur: {b!r}")

    merged = merge_adjacent_spans(annotated_text, adjusted_spans)
    golden_spans = []
    for s in merged:
        category = categorize(s.text)
        golden_spans.append(
            {"start": s.start, "end": s.end, "text": s.text, "category": category}
        )
        if category == "INCONNU":
            print(f"[WARN] story2: uncategorized value {s.text!r}")

    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    with open(FIXTURES_DIR / "story2_source.txt", "w", encoding="utf-8", newline="") as f:
        f.write(source_text)
    (FIXTURES_DIR / "story2_expected_spans.json").write_text(
        json.dumps(golden_spans, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"story2: {len(golden_spans)} spans -> fixtures written")


if __name__ == "__main__":
    main()
