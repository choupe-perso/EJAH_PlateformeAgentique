# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Fallback recognizer for person names that spaCy's NER misses entirely.

Statistical NER is unreliable on a name that occurs exactly once in a
document, with no repeated mention to fall back on (see
detection_dcp_055... in engine.py's name-propagation pass, which only
helps for names NER caught *somewhere*). This recognizer catches a
capitalized word matching a common French first name, at low confidence -
low enough that it never overrides a NER/regex/context match, it only
fills gaps.

Inherently incomplete (open vocabulary, French-only) - a starting point to
extend, not a complete name list.
"""
from __future__ import annotations

import re

from app.domain.entities import EntityType
from app.domain.span import Span

_FIRST_NAMES = {
    "Alexandre", "Alice", "Amandine", "Amélie", "Anne", "Antoine", "Arnaud",
    "Audrey", "Aurélie", "Baptiste", "Benjamin", "Benoît", "Bernard",
    "Camille", "Caroline", "Cécile", "Charlotte", "Chloé", "Christelle",
    "Christophe", "Claire", "Clément", "Corentin", "Damien", "Daniel",
    "David", "Delphine", "Denis", "Diane", "Elise", "Élise", "Elodie",
    "Élodie", "Emma", "Emmanuel", "Emmanuelle", "Eric", "Éric", "Etienne",
    "Étienne", "Fabien", "Fabrice", "Florence", "Florent", "Florian",
    "Francis", "Franck", "François", "Françoise", "Frédéric", "Gabriel",
    "Gaëlle", "Geoffrey", "Georges", "Gérard", "Grégory", "Guillaume",
    "Gwendoline", "Hélène", "Henri", "Hugo", "Ines", "Inès", "Isabelle",
    "Jacques", "Jean", "Jeanne", "Jérémy", "Jérôme", "Joël", "Julie",
    "Julien", "Juliette", "Justine", "Karim", "Kevin", "Laetitia", "Laura",
    "Laurence", "Laurent", "Léa", "Lise", "Louis", "Louise", "Lucas",
    "Lucie", "Ludovic", "Manon", "Marc", "Marceau", "Marie", "Marion",
    "Martin", "Mathieu", "Mathilde", "Mathis", "Maxime", "Mélanie",
    "Michel", "Mickaël", "Morgane", "Nadia", "Nathalie", "Nicolas",
    "Noémie", "Olivier", "Pascal", "Patrice", "Patricia", "Patrick",
    "Paul", "Pauline", "Philippe", "Pierre", "Quentin", "Rachel", "Raphaël",
    "Rémi", "Renaud", "Richard", "Robert", "Romain", "Sabine", "Samuel",
    "Sandra", "Sandrine", "Sarah", "Sébastien", "Sofia", "Sofiane", "Sonia",
    "Sophie",
    "Stéphane", "Stéphanie", "Sylvain", "Sylvie", "Thibault", "Thierry",
    "Thomas", "Valentin", "Valérie", "Vincent", "Virginie", "Xavier",
    "Yann", "Yves", "Yvette", "Zoé",
}

_WORD_RE = re.compile(r"\b[A-ZÀ-Ý][\wÀ-ÿ'’\-]*\b")


class FirstNameRecognizer:
    name = "first_name_gazetteer"

    def find(self, text: str) -> list[Span]:
        spans: list[Span] = []
        for m in _WORD_RE.finditer(text):
            if m.group(0) in _FIRST_NAMES:
                spans.append(
                    Span(m.start(), m.end(), m.group(0), EntityType.PERSONNE, 0.55, self.name)
                )
        return spans
