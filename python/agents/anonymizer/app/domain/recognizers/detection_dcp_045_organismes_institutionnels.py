# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Recognizer for institutional/organization names and acronyms that
identify the organization behind a document even outside any sentence
context - typically a logo (OCR'd from a header/footer image) or a bare
letterhead mention, where there's no "chez X" trigger phrase nearby for
detection_dcp_030's context recognizer to anchor on, and too little
surrounding text for spaCy's NER to reliably tag it as an organization.

Curated, user-extensible list: which organization appears on a client's
letterhead is inherently open vocabulary (a new engagement can bring a
new one), same spirit as the sensitive dictionary (detection_dcp_040) and
common first names (detection_dcp_055) - a starting point to extend, not
a complete list. Tagged EMPLOYEUR, the existing category for "the
organization behind this document" (see detection_dcp_030's "chez X"
pattern and detection_dcp_050's ORG->EMPLOYEUR mapping).
"""
from __future__ import annotations

import re

from app.domain.entities import EntityType
from app.domain.recognizers.detection_dcp_010_interface_recognizer import flex
from app.domain.span import Span

_ORGANISMES = flex(
    r"ANSM|Agence nationale de sécurité du médicament"
    r"(?:\s+et des produits de santé)?"
)
_ORGANISME_RE = re.compile(rf"\b(?P<val>{_ORGANISMES})\b", re.IGNORECASE)


class OrganismeRecognizer:
    name = "organisme"

    def find(self, text: str) -> list[Span]:
        spans: list[Span] = []
        for m in _ORGANISME_RE.finditer(text):
            start, end = m.span("val")
            # Just above NER's 0.7 baseline (this recognizer exists
            # precisely because NER is unreliable on a bare acronym with
            # no sentence context) but below the domain/URL regex's 0.75
            # - "ansm.sante.fr" must stay one complete SITE_WEB match
            # (see detection_dcp_020), not get split into a redacted
            # "ansm" plus an exposed, still-readable ".sante.fr".
            spans.append(
                Span(start, end, m.group("val"), EntityType.EMPLOYEUR, 0.72, self.name)
            )
        return spans
