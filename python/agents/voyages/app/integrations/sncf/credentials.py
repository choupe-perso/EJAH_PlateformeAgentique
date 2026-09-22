# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Stockage des identifiants SNCF Connect dans le Gestionnaire
d'identifiants Windows (jamais en clair ailleurs, jamais transmis en
dehors de cette machine, jamais journalisés).

Migré depuis l'ancienne plateforme Flask
(agents/generateur_ics_sncf/scraping.py) vers l'agent EJAH "voyages" -
même mécanisme (module `keyring`), nom de service dédié à ce nouvel agent
(les identifiants enregistrés par une éventuelle ancienne installation ne
sont pas repris automatiquement)."""
from __future__ import annotations

import keyring

SERVICE_NAME = "EJAH-Voyages"
EMAIL_KEY = "sncf_email"


def enregistrer_identifiants(email: str, mot_de_passe: str) -> None:
    """Enregistre l'email et le mot de passe SNCF Connect dans le
    Gestionnaire d'identifiants Windows.

    Args:
        email: Adresse email du compte SNCF Connect.
        mot_de_passe: Mot de passe associé.
    """
    keyring.set_password(SERVICE_NAME, EMAIL_KEY, email)
    keyring.set_password(SERVICE_NAME, email, mot_de_passe)


def obtenir_identifiants() -> tuple[str, str] | tuple[None, None]:
    """Lit l'email et le mot de passe SNCF Connect depuis le Gestionnaire d'identifiants.

    Returns:
        Un tuple (email, mot_de_passe), ou (None, None) si rien n'est enregistré.
    """
    email = keyring.get_password(SERVICE_NAME, EMAIL_KEY)
    if not email:
        return None, None
    mot_de_passe = keyring.get_password(SERVICE_NAME, email)
    if not mot_de_passe:
        return None, None
    return email, mot_de_passe


def identifiants_configures() -> bool:
    """Indique si des identifiants SNCF Connect sont déjà enregistrés.

    Returns:
        True si un couple email/mot de passe est présent dans le Gestionnaire
        d'identifiants Windows.
    """
    email, mot_de_passe = obtenir_identifiants()
    return bool(email and mot_de_passe)
