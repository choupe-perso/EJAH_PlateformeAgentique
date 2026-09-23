# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Règles de validation des tâches (rdv/email/prompt), sans dépendance au
système de fichiers ni à Ollama - c'est le rôle de app.integrations.

Migré depuis l'ancienne plateforme Flask (agents/todos_transport/
validation.py), logique inchangée."""
from __future__ import annotations

from typing import Any

ALERTES_VALIDES_MINUTES = (5, 10, 30, 60, 120)
IA_VALIDES = ("chatgpt", "copilot", "gemini", "claude")


def _texte(valeur: Any) -> str:
    return str(valeur).strip() if valeur is not None else ""


def _nombre(valeur: Any) -> float | None:
    try:
        return float(valeur)
    except (TypeError, ValueError):
        return None


def valider_rdv(donnees: dict[str, Any]) -> list[str]:
    """Valide les champs d'un RDV : titre, date de début, durée (> 0
    minutes) et alerte (l'une des valeurs de ALERTES_VALIDES_MINUTES)."""
    erreurs: list[str] = []

    if not _texte(donnees.get("titre")):
        erreurs.append("Le titre du RDV est requis.")
    if not _texte(donnees.get("dateDebut")):
        erreurs.append("La date de début est requise.")

    duree = _nombre(donnees.get("dureeMinutes"))
    if duree is None or duree <= 0:
        erreurs.append("La durée doit être un nombre de minutes strictement positif.")

    alerte = _nombre(donnees.get("alerteMinutes"))
    if alerte is None or int(alerte) not in ALERTES_VALIDES_MINUTES:
        valeurs = ", ".join(str(v) for v in ALERTES_VALIDES_MINUTES)
        erreurs.append(f"L'alerte doit être l'une des valeurs suivantes (en minutes) : {valeurs}.")

    return erreurs


def valider_email(donnees: dict[str, Any]) -> list[str]:
    """Valide les champs d'un email : destinataire, titre et texte."""
    erreurs: list[str] = []

    if not _texte(donnees.get("destinataire")):
        erreurs.append("Le destinataire est requis.")
    if not _texte(donnees.get("titre")):
        erreurs.append("Le titre de l'email est requis (génère un brouillon ou saisis-le à la main).")
    if not _texte(donnees.get("texte")):
        erreurs.append("Le texte de l'email est requis (génère un brouillon ou saisis-le à la main).")

    return erreurs


def valider_prompt(donnees: dict[str, Any]) -> list[str]:
    """Valide les champs d'un prompt : IA cible, projet, titre et texte."""
    erreurs: list[str] = []

    ia = _texte(donnees.get("ia")).lower()
    if ia not in IA_VALIDES:
        erreurs.append(f"L'IA cible doit être l'une des suivantes : {', '.join(IA_VALIDES)}.")
    if not _texte(donnees.get("projet")):
        erreurs.append("Le projet est requis.")
    if not _texte(donnees.get("titre")):
        erreurs.append("Le titre est requis.")
    if not _texte(donnees.get("texte")):
        erreurs.append("Le texte du prompt est requis (génère un brouillon ou saisis-le à la main).")

    return erreurs


def valider_tache(type_tache: str, donnees: dict[str, Any]) -> list[str]:
    if type_tache == "rdv":
        return valider_rdv(donnees)
    if type_tache == "email":
        return valider_email(donnees)
    if type_tache == "prompt":
        return valider_prompt(donnees)
    return [f"Type de tâche inconnu : {type_tache!r}."]
