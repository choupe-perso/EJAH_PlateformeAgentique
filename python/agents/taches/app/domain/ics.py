# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Génération d'un fichier .ics (RFC 5545) pour un RDV unique de l'agent
Tâches : un VEVENT avec un rappel (VALARM) avant son début.

Heure « flottante » (sans TZID ni suffixe Z) : usage strictement personnel,
import manuel dans l'agenda sur la même machine/fuseau horaire - même
convention que l'agent voyages.

Migré depuis l'ancienne plateforme Flask (agents/todos_transport/ics.py),
logique inchangée."""
from __future__ import annotations

import uuid
from datetime import datetime

LARGEUR_MAX_LIGNE = 75


def echapper_texte_ics(texte: str) -> str:
    """Échappe une valeur TEXT au sens RFC 5545 (SUMMARY, DESCRIPTION, ...)."""
    texte = texte.replace("\\", "\\\\")
    texte = texte.replace(",", "\\,")
    texte = texte.replace(";", "\\;")
    texte = texte.replace("\r\n", "\\n").replace("\n", "\\n")
    return texte


def plier_ligne(ligne: str) -> str:
    """Replie une ligne de contenu ICS dépassant 75 octets, comme l'exige RFC 5545."""
    donnees = ligne.encode("utf-8")
    if len(donnees) <= LARGEUR_MAX_LIGNE:
        return ligne

    morceaux: list[str] = []
    reste = ligne
    premiere = True
    while reste:
        limite = LARGEUR_MAX_LIGNE if premiere else LARGEUR_MAX_LIGNE - 1
        morceau = reste[:limite]
        while len(morceau.encode("utf-8")) > limite and morceau:
            morceau = morceau[:-1]
        morceaux.append(morceau)
        reste = reste[len(morceau):]
        premiere = False
    return "\r\n ".join(morceaux)


def _formater_datetime_locale(moment: datetime) -> str:
    return moment.strftime("%Y%m%dT%H%M%S")


def _lignes_valarm(description: str, minutes_avant: int) -> list[str]:
    return [
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        f"DESCRIPTION:{echapper_texte_ics(description)}",
        f"TRIGGER:-PT{minutes_avant}M",
        "END:VALARM",
    ]


def construire_ics_rdv(
    identifiant: str,
    titre: str,
    date_debut: datetime,
    duree_minutes: int,
    alerte_minutes: int,
    description: str | None = None,
) -> str:
    """Construit le contenu d'un fichier .ics pour un unique RDV.

    Args:
        identifiant: Identifiant de la tâche (utilisé dans l'UID de l'événement).
        titre: Résumé de l'événement (SUMMARY).
        date_debut: Date/heure de début, heure locale flottante.
        duree_minutes: Durée de l'événement en minutes.
        alerte_minutes: Délai du rappel avant le début, en minutes.
        description: Description optionnelle de l'événement.

    Returns:
        Le contenu texte complet du fichier .ics, en CRLF.
    """
    lignes = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//EJAH//Agent taches//FR",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        f"UID:taches-{identifiant}-{uuid.uuid4().hex}@ejah.local",
        f"DTSTAMP:{_formater_datetime_locale(datetime.now())}",
        f"DTSTART:{_formater_datetime_locale(date_debut)}",
        f"DURATION:PT{duree_minutes}M",
        f"SUMMARY:{echapper_texte_ics(titre)}",
        *([f"DESCRIPTION:{echapper_texte_ics(description)}"] if description else []),
        *_lignes_valarm(titre, alerte_minutes),
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return "\r\n".join(plier_ligne(ligne) for ligne in lignes) + "\r\n"
