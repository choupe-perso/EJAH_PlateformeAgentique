# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Recognizers for GDPR Art. 9/10 "special category" data: health,
religion, sexual orientation, ethnic origin, union membership, political
opinion, criminal records.

These have no reliable fixed format - detection here is a curated,
user-extensible list of French keywords/phrases and a few context
patterns. It is inherently best-effort (open vocabulary): treat it as a
starting point to extend, not a complete detector.
"""
from __future__ import annotations

import re

from app.domain.entities import EntityType
from app.domain.recognizers.detection_dcp_010_interface_recognizer import flex
from app.domain.span import Span

# flex(): hard-wrapped plain text can word-wrap between any two words of
# these multi-word phrases (confirmed by the Histoire_N corpus), so every
# literal space below has to tolerate standing in for a "\n" too.
_DISEASES = flex(
    # "sclérose" alone (not just "sclérose en plaques") - a document that
    # names the full condition once often refers back to it later with
    # just the short form ("la sclérose n'a pas évolué").
    r"scl[ée]rose(?: en plaques)?|maladie de Crohn|diab[èe]te(?: de type [12])?|"
    r"cancer(?: du \w+)?|d[ée]pression|[ée]pisode d[ée]pressif|schizophr[ée]nie|VIH|sida|"
    r"h[ée]patite [abc]|asthme|[ée]pilepsie|Alzheimer|Parkinson|"
    r"trouble(?:s)? bipolaire(?:s)?|hypertension art[ée]rielle|"
    r"accident vasculaire c[ée]r[ée]bral|phl[ée]bite|"
    r"handicap (?:moteur|mental|visuel|auditif)|travailleur handicap[ée]|RQTH"
)
_TREATMENTS = flex(
    r"interf[ée]ron\s+\w+|chimioth[ée]rapie(?:\s+\w+){0,2}|insuline|"
    r"dim[ée]thyl fumarate|"
    r"antid[ée]presseurs?|anxiolytiques?|anticoagulants?|"
    r"traitement (?:quotidien\s+)?(?:de|par)\s+[a-zà-ÿ]+(?:\s+[a-zà-ÿ]+)?"
)
_RELIGIONS = flex(
    r"catholique|protestant[e]?|musulman[e]?|juif|juive|bouddhiste|"
    r"hindou[e]?|orthodoxe|ath[ée]e|agnostique|chr[ée]tien(?:ne)?|[ée]vang[ée]lique"
)
_ORIENTATIONS = flex(
    r"en couple avec un[e]? (?:homme|femme)|mari[ée][e]?\s+à\s+un[e]?\s+(?:homme|femme)|"
    r"pacs[ée][e]?\s+à\s+un[e]?\s+(?:homme|femme)|homosexuel(?:le)?|"
    r"h[ée]t[ée]rosexuel(?:le)?|bisexuel(?:le)?|\bgay\b|lesbienne"
)
_SYNDICATS = r"CFDT|CGT|FO|CFTC|CFE-CGC|UNSA|Solidaires|FSU"
_JUDICIAL_PHRASES = flex(
    r"suspension de permis(?: de [\wÀ-ÿ]+(?: [\wÀ-ÿ]+){0,2})?|"
    r"conduite en état d['’]ivresse|conduite sans assurance|"
    r"conduite sous l['’]emprise(?: de [\wÀ-ÿ]+)?|"
    r"tribunal (?:judiciaire|correctionnel|administratif|de commerce|d['’]instance)"
    r"(?: de [\wÀ-ÿ\-]+)?"
)

_PATTERNS: list[tuple[re.Pattern, EntityType, float]] = [
    (re.compile(rf"\b(?P<val>{_DISEASES})\b", re.IGNORECASE), EntityType.SANTE, 0.75),
    (re.compile(rf"\b(?P<val>{_TREATMENTS})\b", re.IGNORECASE), EntityType.SANTE, 0.7),
    (
        re.compile(r"(?:suivait|suit)[^.]*?\b(?P<val>psychoth[ée]rapie[^.,]*)"),
        EntityType.SANTE,
        0.7,
    ),
    (
        re.compile(
            flex("groupe sanguin")
            + r"\s+(?P<val>[ABO]{1,2}\+?(?:\s?(?:positif|n[ée]gatif))?)"
        ),
        EntityType.SANTE,
        0.75,
    ),
    (
        re.compile(
            r"\b(?P<val>allergies?(?:\s+sévères?)?\s+(?:aux?|à\s+la|à\s+l['’])\s+"
            r"[\wÀ-ÿ'\- ]+?)(?=[,.;\n]|$)",
            re.IGNORECASE,
        ),
        EntityType.SANTE,
        0.7,
    ),
    (
        re.compile(
            rf"\b(?P<val>(?:{_RELIGIONS})(?:\s+non\s+\w+|\s+pratiquant[e]?)?)\b",
            re.IGNORECASE,
        ),
        EntityType.RELIGION,
        0.65,
    ),
    (
        re.compile(
            rf"\b(?P<val>{flex('sans religion|sans appartenance religieuse')})\b",
            re.IGNORECASE,
        ),
        EntityType.RELIGION,
        0.65,
    ),
    (
        re.compile(
            r"\b(?P<val>alimentation\s+(?:strictement\s+)?(?:casher|hal[a]l)|"
            r"casher|hal[a]l)\b",
            re.IGNORECASE,
        ),
        EntityType.RELIGION,
        0.65,
    ),
    (
        re.compile(rf"\b(?P<val>{_ORIENTATIONS})\b", re.IGNORECASE),
        EntityType.ORIENTATION_SEXUELLE,
        0.7,
    ),
    (
        re.compile(r"d['’](?P<val>origine\s+\w+)\b"),
        EntityType.ORIGINE,
        0.7,
    ),
    (re.compile(rf"\b(?P<val>{_SYNDICATS})\b"), EntityType.SYNDICAT, 0.85),
    (
        # generic fallback for a union acronym not in the curated list
        # above (e.g. "syndicat SUD") - anchored on the trigger word so
        # it doesn't fire on an unrelated capitalized word.
        re.compile(r"syndicat\s+(?P<val>[A-Z][A-Z\-]{1,15})\b"),
        EntityType.SYNDICAT,
        0.75,
    ),
    (
        # [\wÀ-ÿ\-]+ (not \w+): a party/movement name can be hyphenated
        # ("centre-droit", "extrême-gauche") - \w+ alone stops at the
        # hyphen and leaves the rest of the word unredacted in the output.
        re.compile(
            r"(?P<val>parti\s+(?:de\s+)?[\wÀ-ÿ\-]+(?:\s+[\wÀ-ÿ\-]+)?|"
            r"mouvement\s+[\wÀ-ÿ\-]+(?:\s+[\wÀ-ÿ\-]+)?)"
        ),
        EntityType.OPINION_POLITIQUE,
        0.55,
    ),
    (
        # "participer à la campagne d'un candidat écologiste" - the party
        # leaning is the sensitive fact, not the word "campagne" itself.
        re.compile(
            r"campagne\s+(?:électorale\s+)?d['’]un[e]?\s+"
            r"(?P<val>candidat[e]?\s+[\wÀ-ÿ\-]+)",
            re.IGNORECASE,
        ),
        EntityType.OPINION_POLITIQUE,
        0.7,
    ),
    (
        # "voter pour une liste régionaliste/centriste"
        re.compile(
            rf"(?:{flex('voter pour')}|voté,?[^.]*?pour)\s+"
            r"(?P<val>une\s+liste\s+[\wÀ-ÿ\-]+)"
        ),
        EntityType.OPINION_POLITIQUE,
        0.7,
    ),
    (
        re.compile(
            r"condamn[ée]{1,2}[^,]*,[^,]*,\s*à\s+(?P<val>[^—\n]+?)(?=\s+—|\.)"
        ),
        EntityType.CASIER_JUDICIAIRE,
        0.75,
    ),
    (
        re.compile(rf"\b(?P<val>{_JUDICIAL_PHRASES})\b", re.IGNORECASE),
        EntityType.CASIER_JUDICIAIRE,
        0.7,
    ),
]


class SensitiveDictionaryRecognizer:
    name = "sensitive_dictionary"

    def find(self, text: str) -> list[Span]:
        spans: list[Span] = []
        for pattern, entity_type, score in _PATTERNS:
            for m in pattern.finditer(text):
                start, end = m.span("val")
                spans.append(
                    Span(start, end, m.group("val"), entity_type, score, self.name)
                )
        return spans
