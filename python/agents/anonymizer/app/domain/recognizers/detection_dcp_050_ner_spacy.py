# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Named-entity recognition for persons, places and organizations, backed
by spaCy's French pipeline. Loaded lazily since it is the slowest and
heaviest recognizer to initialize.
"""
from __future__ import annotations

from app.domain.entities import EntityType
from app.domain.span import Span

_LABEL_MAP = {
    "PER": EntityType.PERSONNE,
    "LOC": EntityType.LIEU_NAISSANCE,
    "ORG": EntityType.EMPLOYEUR,
}

# Institutional/technical acronyms - and a few ordinary words/proper nouns
# - spaCy's French model has been observed to mistake for a person, place
# or organization when they stand alone (e.g. "IBAN pour le versement des
# fonds" -> "IBAN" tagged LOC; "Instagram" tagged PER; a sentence-initial
# capitalized word like "Réunies" tagged LOC). None of these are ever
# personal data by themselves, so drop an exact (case-sensitive) match
# outright rather than let a wrong-category NER guess win the overlap
# against a real recognizer, or leave a stray, meaningless token in the
# anonymized output. Extend as new false positives turn up.
_NON_ENTITY_ACRONYMS = {
    "IBAN",
    "RIB",
    "SIRET",
    "SIREN",
    "IRM",
    "VPN",
    "CPAM",
    "FICP",
    "RQTH",
    "CNI",
    "NIR",
    "TVA",
    "IP",
    "CB",
    "RH",
    "DRH",
    "PDF",
    "CDI",
    "CDD",
    "ESN",
    "PME",
    "PMR",
    "AVE",
    "SIV",
    # Social/tech platform names - never a person or an employer.
    "LinkedIn",
    "Instagram",
    "Facebook",
    "Twitter",
    "TikTok",
    "Snapchat",
    "Strava",
    # Ordinary words wrongly capitalized at a sentence start.
    "Réunies",
}


class NerRecognizer:
    name = "ner"

    def __init__(self, model: str = "fr_core_news_lg") -> None:
        self._model_name = model
        self._nlp = None

    def _ensure_loaded(self):
        if self._nlp is None:
            import spacy

            self._nlp = spacy.load(self._model_name)
        return self._nlp

    def find(self, text: str) -> list[Span]:
        nlp = self._ensure_loaded()
        doc = nlp(text)
        spans: list[Span] = []
        for ent in doc.ents:
            entity_type = _LABEL_MAP.get(ent.label_)
            if entity_type is None:
                continue
            if ent.text.strip() in _NON_ENTITY_ACRONYMS:
                continue
            spans.append(
                Span(
                    ent.start_char,
                    ent.end_char,
                    ent.text,
                    entity_type,
                    0.7,
                    self.name,
                )
            )
        return spans
