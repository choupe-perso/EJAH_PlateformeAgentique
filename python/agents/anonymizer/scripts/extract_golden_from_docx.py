"""Regenerate tests/fixtures/ (plain text + expected entity spans) from the
5 example .docx pairs supplied by the user.

For each "Histoire_test_anonymisation_FormatN.docx" (annotated: personal
values in bold red C00000), the matching "... - Source.docx" is the plain
document actually received. Both share identical body text; the annotated
copy is only used to know which spans are personal data (ground truth).

Usage:
    python scripts/extract_golden_from_docx.py
"""
from __future__ import annotations

import html
import json
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path

RESOURCES_DIR = Path(
    r"D:\IA_Archi2026\IALocalPortableCHO\LocalClaudeProjects\ToolkitIA"
    r"\900_Ressources\Anonymisation"
)
FIXTURES_DIR = Path(__file__).resolve().parent.parent / "tests" / "fixtures"

W_P = re.compile(r"<w:p[ >].*?</w:p>", re.DOTALL)
W_R = re.compile(r"<w:r[ >].*?</w:r>", re.DOTALL)
W_T = re.compile(r"<w:t[^>]*>(.*?)</w:t>", re.DOTALL)
W_TAB = re.compile(r"<w:tab/>")
W_BOLD = re.compile(r"<w:b/>|<w:b w:val=\"?(true|1)\"?/>")
W_COLOR = re.compile(r'<w:color w:val="([0-9A-Fa-f]{6})"')

# Ordered, longest-first list of known personal-data values -> category.
# Built from a manual read of the 5 annotated documents (see plan).
CATEGORY_BY_VALUE = [
    ("Élodie Vasseur — Finance & RSE", "RESEAU_SOCIAL"),
    ("27 rue des Frères Lumière, 63100 Clermont-Ferrand", "ADRESSE"),
    ("FR76 3000 4008 2800 0123 4567 890", "IBAN"),
    ("14 bis avenue Berthelot, 69007 Lyon", "ADRESSE"),
    ("psychothérapie de soutien tous les jeudis", "SANTE"),
    ("8 quai Rambaud, 69002 Lyon", "ADRESSE"),
    ("une amende pour conduite sans assurance", "CASIER_JUDICIAIRE"),
    ("Clermont-Ferrand (Puy-de-Dôme)", "LIEU_NAISSANCE"),
    ("catholique non observante", "RELIGION"),
    ("en couple avec une femme", "ORIENTATION_SEXUELLE"),
    ("Crédit Agricole Centre France", "BANQUE"),
    ("Auvergne Ingénierie Data", "EMPLOYEUR"),
    ("parti écologiste local", "OPINION_POLITIQUE"),
    ("elodie.vasseur1987@gmail.com", "EMAIL"),
    ("origine martiniquaise", "ORIGINE"),
    ("Anne-Sophie Rambert", "PERSONNE"),
    ("Liège, en Belgique", "LIEU_NAISSANCE"),
    ("responsable comptable", "POSTE"),
    ("sclérose en plaques", "SANTE"),
    ("Camille Dubuisson", "PERSONNE"),
    ("Sabine Oliveira", "PERSONNE"),
    ("interféron bêta", "SANTE"),
    ("2 septembre 1990", "DATE_NAISSANCE"),
    ("21 janvier 1985", "DATE_NAISSANCE"),
    ("maladie de Crohn", "SANTE"),
    ("2 87 03 63 231 087 42", "NIR"),
    ("1 90 09 69 155 093 18", "NIR"),
    ("27 rue des Frères Lumière", "ADRESSE"),
    ("@elovasseur_running", "RESEAU_SOCIAL"),
    ("Aug2026!Temp92", "MOT_DE_PASSE"),
    ("92.184.113.47", "IP"),
    ("998134672541", "CNI"),
    ("774125390612", "CNI"),
    ("692113045578", "TITRE_SEJOUR"),
    ("14 mars 1987", "DATE_NAISSANCE"),
    ("19FR84512", "PASSEPORT"),
    ("6X3K9P2LFR", "COLIS"),
    ("CL-8847213", "NUMERO_CLIENT"),
    ("Camille Dubuisson", "PERSONNE"),
    ("46 500 euros", "SALAIRE"),
    ("FX-482-QT", "PLAQUE"),
    ("04 73 92 15 08", "TELEPHONE"),
    ("06 71 44 29 53", "TELEPHONE"),
    ("Élodie Vasseur", "PERSONNE"),
    ("Camille Dubuisson", "PERSONNE"),
    ("e.vasseur", "IDENTIFIANT"),
    ("Riom", "LIEU_NAISSANCE"),
    ("CFDT", "SYNDICAT"),
    ("Camille", "PERSONNE"),
    ("Julien", "PERSONNE"),
    ("Élodie", "PERSONNE"),
    ("4512", "CARTE_BANCAIRE_PARTIELLE"),
]


@dataclass
class Span:
    start: int
    end: int
    text: str
    category: str


def read_xml(docx_path: Path, member: str) -> str | None:
    with zipfile.ZipFile(docx_path) as zf:
        names = zf.namelist()
        if member not in names:
            return None
        return zf.read(member).decode("utf-8")


def paragraphs_plain_text(xml: str) -> list[str]:
    """Return one plain-text string per <w:p>, concatenating <w:t> runs."""
    out = []
    for p in W_P.findall(xml):
        chunks = []
        for t in W_T.findall(p):
            chunks.append(html.unescape(t))
        # tabs render as a single space in plain text
        text = "".join(chunks)
        text = W_TAB.sub(" ", text)
        out.append(text)
    return out


def paragraphs_with_spans(
    xml: str, colors: set[str] = frozenset({"C00000"})
) -> tuple[list[str], list[Span]]:
    """Like paragraphs_plain_text but also returns bold spans whose color
    is one of `colors`, with offsets relative to the joined-by-\\n full
    text. Defaults to the single-color (red) scheme used by Format1-5;
    pass the full palette for a multi-color annotation scheme."""
    para_texts = []
    spans: list[Span] = []
    offset = 0
    for p in W_P.findall(xml):
        para_chunks = []
        for r in W_R.findall(p):
            t_match = W_T.search(r)
            if not t_match:
                continue
            text = html.unescape(t_match.group(1))
            is_bold = bool(W_BOLD.search(r))
            color_match = W_COLOR.search(r)
            color = color_match.group(1).upper() if color_match else None
            start = offset + sum(len(c) for c in para_chunks)
            para_chunks.append(text)
            if is_bold and color in colors:
                spans.append(Span(start, start + len(text), text, "?"))
        para_text = "".join(para_chunks)
        para_texts.append(para_text)
        offset += len(para_text) + 1  # +1 for the "\n" joiner
    return para_texts, spans


def merge_adjacent_spans(text: str, spans: list[Span]) -> list[Span]:
    """Merge spans that are directly adjacent in the full text (e.g. a value
    split across a page-break or a spell-check run boundary into 2 runs)."""
    spans = sorted(spans, key=lambda s: s.start)
    merged: list[Span] = []
    for s in spans:
        if merged and s.start == merged[-1].end:
            prev = merged[-1]
            merged[-1] = Span(prev.start, s.end, text[prev.start : s.end], "?")
        else:
            merged.append(s)
    return merged


def categorize(value: str) -> str:
    normalized = value.strip()
    for known_value, category in CATEGORY_BY_VALUE:
        if normalized == known_value:
            return category
    return "INCONNU"


def process_format(n: int) -> None:
    source_path = RESOURCES_DIR / f"Histoire_test_anonymisation_Format{n} - Source.docx"
    annotated_path = RESOURCES_DIR / f"Histoire_test_anonymisation_Format{n}.docx"

    source_xml = read_xml(source_path, "word/document.xml")
    annotated_xml = read_xml(annotated_path, "word/document.xml")

    source_paras = paragraphs_plain_text(source_xml)
    source_text = "\n".join(source_paras)

    annotated_paras, raw_spans = paragraphs_with_spans(annotated_xml)
    annotated_text = "\n".join(annotated_paras)

    if annotated_text != source_text:
        print(
            f"[WARN] Format{n}: source and annotated body text differ; "
            "spans will be located in the annotated text and may be "
            "off relative to the source text."
        )

    merged = merge_adjacent_spans(annotated_text, raw_spans)
    golden_spans = []
    for s in merged:
        category = categorize(s.text)
        golden_spans.append(
            {"start": s.start, "end": s.end, "text": s.text, "category": category}
        )
        if category == "INCONNU":
            print(f"[WARN] Format{n}: uncategorized value {s.text!r}")

    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    # newline="": keep plain "\n" on disk, don't let Windows translate it
    # to "\r\n" (that would break an exact round-trip test against this
    # fixture later).
    with open(FIXTURES_DIR / f"format{n}_source.txt", "w", encoding="utf-8", newline="") as f:
        f.write(source_text)
    (FIXTURES_DIR / f"format{n}_expected_spans.json").write_text(
        json.dumps(golden_spans, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Format{n}: {len(golden_spans)} spans -> fixtures written")


def main() -> None:
    for n in range(1, 6):
        process_format(n)


if __name__ == "__main__":
    main()
