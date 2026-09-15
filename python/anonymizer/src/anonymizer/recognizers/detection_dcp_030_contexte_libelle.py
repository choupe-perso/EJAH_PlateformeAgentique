"""Recognizers for values that have no distinctive format of their own and
can only be found via a French trigger phrase immediately before them
(e.g. "mot de passe ... était <X>", "identifiant ... <X> affiché").
"""
from __future__ import annotations

import re

from anonymizer.entities import EntityType
from anonymizer.recognizers.detection_dcp_010_interface_recognizer import flex
from anonymizer.span import Span

_MONTHS = (
    "janvier|février|mars|avril|mai|juin|juillet|"
    "août|septembre|octobre|novembre|décembre"
)

# (pattern with a named group "val", entity type, score)
_PATTERNS: list[tuple[re.Pattern, EntityType, float]] = [
    (
        re.compile(
            rf"[Nn]é\(?e?\)?\s+le\s+(?P<val>\d{{1,2}}\s+(?:{_MONTHS})\s+\d{{4}})"
        ),
        EntityType.DATE_NAISSANCE,
        0.95,
    ),
    (
        re.compile(
            flex("date de naissance,") + rf"\s+(?P<val>\d{{1,2}}\s+(?:{_MONTHS})\s+\d{{4}})"
        ),
        EntityType.DATE_NAISSANCE,
        0.9,
    ),
    (
        re.compile(
            flex("carte (?:nationale(?: d['’]identité)?|d['’]identité)")
            + r"[^\d]{0,20}(?P<val>\d{9,14})"
        ),
        EntityType.CNI,
        0.9,
    ),
    (
        re.compile(flex("permis de conduire") + r"\s+(?P<val>[A-Z0-9]{6,15})"),
        EntityType.PERMIS_CONDUIRE,
        0.9,
    ),
    (
        re.compile(flex("carte de s[ée]jour") + r"[^.]*?num[ée]ro\s+(?P<val>\d{9,14})"),
        EntityType.TITRE_SEJOUR,
        0.9,
    ),
    (
        # "salaire annuel brut de X", "salaire net mensuel de X", ...
        re.compile(r"salaire\s+(?:\w+\s+){0,2}de\s+(?P<val>[\d\s]{2,10}euros?)"),
        EntityType.SALAIRE,
        0.9,
    ),
    (
        re.compile(
            flex("identifiant professionnel")
            + r"[^.]*?(?:est|était|serait|sera|:)\s+(?P<val>[\w.\-]+)"
        ),
        EntityType.IDENTIFIANT,
        0.9,
    ),
    (
        re.compile(r"identifiant\s+(?P<val>[\w.\-]+)\s+affich\w*"),
        EntityType.IDENTIFIANT,
        0.85,
    ),
    (
        # reversed order: "l'écran affichait encore l'identifiant <X>"
        re.compile(r"affich\w*[^.]*?identifiant\s+(?P<val>[\w.\-]+)"),
        EntityType.IDENTIFIANT,
        0.85,
    ),
    (
        re.compile(flex("mot de passe") + r"[^.]*?était\s+(?P<val>\S+)"),
        EntityType.MOT_DE_PASSE,
        0.9,
    ),
    (
        # "un mot de passe provisoire, <X>, à changer" - no "était" this time
        re.compile(flex("mot de passe") + r"[^,.:]*,\s*(?P<val>[^\s,]+),"),
        EntityType.MOT_DE_PASSE,
        0.9,
    ),
    (
        re.compile(flex("carte bancaire") + r"[^,]*,\s*(?P<val>\d{4})\b"),
        EntityType.CARTE_BANCAIRE_PARTIELLE,
        0.75,
    ),
    (
        # broader trigger: "carte professionnelle dont ... quatre derniers
        # chiffres, X" / "carte ... seuls les quatre derniers chiffres, X"
        re.compile(
            flex("quatre derniers chiffres") + r"[^,]*,\s*(?P<val>\d{4})\b"
        ),
        EntityType.CARTE_BANCAIRE_PARTIELLE,
        0.75,
    ),
    (
        re.compile(flex("colis,") + r"\s*r[ée]f[ée]rence\s+(?P<val>[A-Z0-9]{6,15})"),
        EntityType.COLIS,
        0.9,
    ),
    (
        # "sous le nom "X"" or "profil LinkedIn, "X"" - a quoted profile
        # name/handle, whatever platform-naming precedes it.
        re.compile(
            rf'(?:{flex("sous le nom")}|profil [A-Za-zÀ-ÿ]+,?)\s+"(?P<val>[^"]+)"'
        ),
        EntityType.RESEAU_SOCIAL,
        0.85,
    ),
    (
        re.compile(
            rf"(?:{flex('travaillait comme')}|rejoignait[^.]*?comme|"
            rf"{flex('occupait un poste de')})\s+"
            r"(?P<val>[a-zà-ÿ][\wÀ-ÿ'\- ]+?)(?=,|\.|\schez\b|\spour\b)"
        ),
        EntityType.POSTE,
        0.85,
    ),
    (
        # Above the NER recognizer's 0.7 baseline: spaCy's French model
        # sometimes mistakes a company name for a person (e.g. "Fluvia
        # Distribution" tagged PER), which would otherwise win the
        # overlap and leave the wrong category in the output. The
        # required capital letter keeps this from firing on "chez elle"
        # / "chez lui" / "chez moi".
        re.compile(r"\bchez\s+(?P<val>[A-ZÀ-Ý][\wÀ-ÿ'\- ]*?)(?=,|\s+une\s|\s+un\s|\.)"),
        EntityType.EMPLOYEUR,
        0.72,
    ),
]

# "Née le <date> à <Lieu>[, en <Pays>]" - the birthplace clause can itself
# contain a comma ("Liège, en Belgique"), so it needs its own lookahead
# rather than a plain "stop at first comma" pattern.
_BIRTHPLACE_RE = re.compile(
    rf"[Nn]é\(?e?\)?\s+le\s+\d{{1,2}}\s+(?:{_MONTHS})\s+\d{{4}}\s+à\s+"
    r"(?P<val>[^,]+(?:,\s*en\s+[A-ZÀ-Ý][\wÀ-ÿ]*)?)"
)


class ContextRecognizer:
    name = "context"

    def find(self, text: str) -> list[Span]:
        spans: list[Span] = []

        for pattern, entity_type, score in _PATTERNS:
            for m in pattern.finditer(text):
                spans.append(self._span(m, entity_type, score))

        for m in _BIRTHPLACE_RE.finditer(text):
            spans.append(self._span(m, EntityType.LIEU_NAISSANCE, 0.9))

        return spans

    def _span(self, m: re.Match, entity_type: EntityType, score: float) -> Span:
        start, end = m.span("val")
        return Span(start, end, m.group("val"), entity_type, score, self.name)
