# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Génération d'un fichier .ics (RFC 5545) à partir d'une liste de voyages
SNCF (telle que produite par app.integrations.sncf.scraping.recuperer_voyages
ou relue depuis le fichier JSON produit par la commande "recuperer").

Heure « flottante » (sans TZID ni suffixe Z) : usage strictement personnel,
import manuel dans l'agenda sur la même machine/fuseau horaire.

Migré depuis l'ancienne plateforme Flask
(agents/generateur_ics_sncf/ics.py) vers l'agent EJAH "voyages" - logique
inchangée, UID/PRODID renommés pour ce nouvel agent.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta

LARGEUR_MAX_LIGNE = 75
DUREE_TRAJET = timedelta(hours=1)


def echapper_texte_ics(texte: str) -> str:
    """Échappe une valeur TEXT au sens RFC 5545 (SUMMARY, DESCRIPTION, ...).

    Args:
        texte: Texte brut à insérer dans le fichier .ics.

    Returns:
        Le texte avec antislash, virgule, point-virgule et retours à la ligne échappés.
    """
    texte = texte.replace("\\", "\\\\")
    texte = texte.replace(",", "\\,")
    texte = texte.replace(";", "\\;")
    texte = texte.replace("\r\n", "\\n").replace("\n", "\\n")
    return texte


def plier_ligne(ligne: str) -> str:
    """Replie une ligne de contenu ICS dépassant 75 octets, comme l'exige RFC 5545.

    Args:
        ligne: Une ligne logique complète (ex. "SUMMARY:...").

    Returns:
        La ligne repliée sur plusieurs lignes physiques (CRLF + espace en continuation).
    """
    donnees = ligne.encode("utf-8")
    if len(donnees) <= LARGEUR_MAX_LIGNE:
        return ligne

    morceaux = []
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


def _lignes_valarm(description: str) -> list[str]:
    """Bloc VALARM RFC 5545 : rappel 1h avant le début du créneau."""
    return [
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        f"DESCRIPTION:{echapper_texte_ics(description)}",
        "TRIGGER:-PT1H",
        "END:VALARM",
    ]


def _debut_voyage(voyage: dict) -> datetime:
    return datetime(
        voyage["annee"], voyage["mois"], voyage["jour"],
        voyage["heure_depart"][0], voyage["heure_depart"][1],
    )


def _trajet_vers_lignes_vevent(voyage: dict, debut_voyage: datetime) -> list[str]:
    debut = debut_voyage - DUREE_TRAJET
    description = (
        f"Trajet avant le train {voyage['train_numero']} "
        f"({voyage['gare_depart']} \u2192 {voyage['gare_arrivee']})."
    )

    return [
        "BEGIN:VEVENT",
        f"UID:voyages-{voyage['id']}-trajet-{uuid.uuid4().hex}@ejah.local",
        f"DTSTAMP:{_formater_datetime_locale(datetime.now())}",
        f"DTSTART:{_formater_datetime_locale(debut)}",
        f"DTEND:{_formater_datetime_locale(debut_voyage)}",
        "SUMMARY:Trajet",
        f"LOCATION:{echapper_texte_ics(voyage['gare_depart'])}",
        f"DESCRIPTION:{echapper_texte_ics(description)}",
        *_lignes_valarm("Trajet"),
        "END:VEVENT",
    ]


def _voyage_vers_lignes_vevent(voyage: dict, debut: datetime) -> list[str]:
    fin = datetime(
        voyage["annee"], voyage["mois"], voyage["jour"],
        voyage["heure_arrivee"][0], voyage["heure_arrivee"][1],
    )
    if fin <= debut:
        fin = fin + timedelta(days=1)

    resume = f"Train {voyage['gare_depart']} \u2192 {voyage['gare_arrivee']} ({voyage['train_numero']})"
    description = (
        f"Dossier : {voyage['dossier']}\n"
        f"Train : {voyage['train_numero']}\n"
        f"Durée : {voyage['duree']}\n"
        f"De {voyage['gare_depart']} à {voyage['gare_arrivee']}"
    )

    return [
        "BEGIN:VEVENT",
        f"UID:voyages-{voyage['id']}-{uuid.uuid4().hex}@ejah.local",
        f"DTSTAMP:{_formater_datetime_locale(datetime.now())}",
        f"DTSTART:{_formater_datetime_locale(debut)}",
        f"DTEND:{_formater_datetime_locale(fin)}",
        f"SUMMARY:{echapper_texte_ics(resume)}",
        f"LOCATION:{echapper_texte_ics(voyage['gare_depart'])}",
        f"DESCRIPTION:{echapper_texte_ics(description)}",
        *_lignes_valarm(resume),
        "END:VEVENT",
    ]


def construire_ics(voyages: list[dict]) -> str:
    """Construit le contenu d'un fichier .ics regroupant plusieurs voyages SNCF.

    Pour chaque voyage, deux créneaux sont créés : un "Trajet" d'1h juste avant
    (pour se rendre à la gare) et le voyage lui-même. Chacun a un rappel (VALARM)
    1h avant son début.

    Args:
        voyages: Liste de voyages (dictionnaires tels que produits par
            app.integrations.sncf.scraping.recuperer_voyages).

    Returns:
        Le contenu texte complet du fichier .ics (deux VEVENT par voyage), en CRLF.
    """
    lignes = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//EJAH//Agent voyages//FR",
        "CALSCALE:GREGORIAN",
        "X-EJAH-AUTEUR:Cree par Cedric HOUPE - usage a l'identique interdit.",
    ]
    for voyage in voyages:
        debut = _debut_voyage(voyage)
        lignes.extend(_trajet_vers_lignes_vevent(voyage, debut))
        lignes.extend(_voyage_vers_lignes_vevent(voyage, debut))
    lignes.append("END:VCALENDAR")

    return "\r\n".join(plier_ligne(ligne) for ligne in lignes) + "\r\n"
