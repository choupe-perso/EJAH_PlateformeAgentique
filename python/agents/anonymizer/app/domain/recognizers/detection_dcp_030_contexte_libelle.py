# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Recognizers for values that have no distinctive format of their own and
can only be found via a French trigger phrase immediately before them
(e.g. "mot de passe ... était <X>", "identifiant ... <X> affiché").
"""
from __future__ import annotations

import re

from app.domain.entities import EntityType
from app.domain.recognizers.detection_dcp_010_interface_recognizer import flex
from app.domain.span import Span

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
            flex("date de naissance,") + r"\s+(?:le\s+)?"
            rf"(?P<val>\d{{1,2}}\s+(?:{_MONTHS})\s+\d{{4}}|\d{{1,2}}[/.]\d{{1,2}}[/.]\d{{4}})"
        ),
        EntityType.DATE_NAISSANCE,
        0.9,
    ),
    (
        # Value shape is [^.]*? (stop at the sentence boundary) then the
        # first standalone alphanumeric token of plausible ID length - not
        # \d{9,14}: the new French CNI number mixes letters and digits
        # (e.g. "19AZ42876"), which a digits-only capture would otherwise
        # truncate (grabbing only its trailing digit run).
        re.compile(
            flex("carte (?:nationale(?: d['’]identité)?|d['’]identité)")
            + r"[^.]*?\b(?P<val>[A-Z0-9]{6,14})\b"
        ),
        EntityType.CNI,
        0.92,
    ),
    (
        # Above the blind PASSPORT_RE shape regex (detection_dcp_020) and
        # above CNI's own score: a passport number and the new CNI format
        # can share the exact same digit-letter-digit shape (both
        # confirmed in the same source document), so only the trigger word
        # actually next to the value can tell them apart reliably.
        re.compile(flex("passeport") + r"[^.]*?\b(?P<val>[A-Z0-9]{6,14})\b"),
        EntityType.PASSEPORT,
        0.93,
    ),
    (
        re.compile(
            flex("num[ée]ro de client")
            + r"[^.]*?\b(?P<val>[A-Z0-9]{3,12}(?:-[A-Z0-9]{2,8})?)\b"
        ),
        EntityType.NUMERO_CLIENT,
        0.9,
    ),
    (
        re.compile(flex("nom de session") + r"[^.]*?(?:était|est|:)\s+(?P<val>[\w.\-]+)"),
        EntityType.IDENTIFIANT,
        0.9,
    ),
    (
        # A bare "VPN : jmorel.ext" (no @domain, otherwise EMAIL already
        # catches it) is a technical identifier, not an organization -
        # above NER's 0.7 baseline, which has been observed to mistake a
        # dotted lowercase handle like this for an ORG.
        re.compile(r"\bVPN\s*:\s*(?P<val>[\w.\-]+)"),
        EntityType.IDENTIFIANT,
        0.88,
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
        # (the amount may be spelled "euros"/"euro" or given as the "€"
        # symbol - both confirmed in real documents).
        re.compile(r"salaire\s+(?:\w+\s+){0,2}de\s+(?P<val>[\d\s]{2,10}(?:euros?|€))"),
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
        # separator before the digits is usually a comma but can be a
        # colon ("la carte utilisée : 4827") - accept either.
        re.compile(flex("carte bancaire") + r"[^,:]*[,:]\s*(?P<val>\d{4})\b"),
        EntityType.CARTE_BANCAIRE_PARTIELLE,
        0.75,
    ),
    (
        # broader trigger: "carte professionnelle dont ... quatre derniers
        # chiffres, X" / "carte ... seuls les quatre derniers chiffres, X"
        re.compile(
            flex("quatre derniers chiffres") + r"[^,:]*[,:]\s*(?P<val>\d{4})\b"
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
        # "sous le nom "X"", "profil LinkedIn, "X"" or "son compte «X»" -
        # a quoted profile name/handle, whatever platform-naming precedes
        # it. Quotes may be straight (") or French guillemets (« »), and
        # guillemets conventionally have an inner space to trim.
        re.compile(
            rf'(?:{flex("sous le nom")}|profil [A-Za-zÀ-ÿ]+,?|compte)\s+'
            r'["«]\s*(?P<val>[^"»]+?)\s*[»"]'
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
        # An org name is one or more CAPITALIZED words, optionally joined
        # by a lowercase connector ("de", "du", "des", "la", "le", "les",
        # "d'") that is itself followed by another capitalized word - not
        # a bare "\w+ ...", which happily swallowed a whole trailing
        # clause with no comma before it (e.g. "chez DataNova Consulting
        # au volant de son Peugeot 3008 bleu nuit" - "au"/"de son" aren't
        # capitalized-word connectors, so the org name now correctly
        # stops at "Consulting").
        re.compile(
            r"\bchez\s+(?P<val>[A-ZÀ-Ý][\wÀ-ÿ'\-]*"
            r"(?:\s+(?:d['’]|de\s+|du\s+|des\s+|la\s+|le\s+|les\s+)?"
            r"[A-ZÀ-Ý][\wÀ-ÿ'\-]*)*)"
        ),
        EntityType.EMPLOYEUR,
        0.72,
    ),
]

# "Née le <date> à <Lieu>[, en <Pays>]" - the birthplace clause can itself
# contain a comma ("Liège, en Belgique"), so it needs its own lookahead
# rather than a plain "stop at first comma" pattern. [^,]+ must also stop
# at a sentence boundary (a period): without it, "né le X à Bruxelles. De
# nationalité belge, il vivait..." greedily swallowed everything up to the
# NEXT comma, silently absorbing "De nationalité belge" (an unrelated
# following sentence) into the birthplace span.
_BIRTHPLACE_RE = re.compile(
    rf"[Nn]é\(?e?\)?\s+le\s+\d{{1,2}}\s+(?:{_MONTHS})\s+\d{{4}}\s+à\s+"
    r"(?P<val>[^,.\n]+(?:,\s*en\s+[A-ZÀ-Ý][\wÀ-ÿ]*)?)"
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
