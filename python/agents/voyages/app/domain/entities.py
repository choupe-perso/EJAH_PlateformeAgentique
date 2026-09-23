# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Éléments métier purs de l'agent voyages : structure d'un Voyage, sa
validation, et le calcul de l'année d'un voyage à partir d'un jour/mois
(SNCF Connect n'affiche jamais l'année sur les voyages à venir). Aucune
dépendance au système de fichiers, à Playwright ou au Gestionnaire
d'identifiants ici - c'est le rôle de app.integrations.sncf."""
from __future__ import annotations

from datetime import date

CHAMPS_VOYAGE_REQUIS = (
    "id",
    "dossier",
    "annee",
    "mois",
    "jour",
    "heure_depart",
    "heure_arrivee",
    "gare_depart",
    "gare_arrivee",
    "train_numero",
    "duree",
)


def valider_voyage(voyage: object) -> bool:
    """Vérifie qu'un objet (typiquement issu d'un fichier JSON fourni par
    l'utilisateur à la commande "generer") possède tous les champs requis
    d'un voyage.

    Args:
        voyage: Valeur à valider - normalement un dict.

    Returns:
        True si `voyage` est un dict contenant tous les champs requis.
    """
    if not isinstance(voyage, dict):
        return False
    return all(champ in voyage for champ in CHAMPS_VOYAGE_REQUIS)


def annee_pour(mois: int, jour: int, aujourdhui: date | None = None) -> int:
    """Déduit l'année d'un voyage à venir à partir de son jour/mois seuls.

    SNCF Connect n'affiche jamais l'année sur la page des voyages à venir
    (ils sont par nature dans le futur proche) : si la date jour/mois est
    déjà passée cette année, le voyage est nécessairement l'année
    suivante.

    Args:
        mois: Mois du voyage (1-12).
        jour: Jour du voyage (1-31).
        aujourdhui: Date de référence, injectable pour les tests -
            `date.today()` par défaut.

    Returns:
        L'année déduite (année courante ou suivante).
    """
    aujourdhui = aujourdhui or date.today()
    candidate = date(aujourdhui.year, mois, jour)
    if candidate < aujourdhui:
        return aujourdhui.year + 1
    return aujourdhui.year
