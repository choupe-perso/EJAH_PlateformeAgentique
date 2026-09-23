# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Tests pour app/integrations/sncf/credentials.py, avec un faux
Gestionnaire d'identifiants Windows (dict en mémoire) à la place du vrai
module `keyring`. Migré depuis l'ancienne plateforme Flask
(tests/test_generateur_ics_sncf_scraping.py, partie identifiants)."""

import pytest

from app.integrations.sncf import credentials


class _KeyringFactice:
    """Remplace le Gestionnaire d'identifiants Windows par un dict en mémoire."""

    def __init__(self):
        self._valeurs = {}

    def set_password(self, service, cle, valeur):
        self._valeurs[(service, cle)] = valeur

    def get_password(self, service, cle):
        return self._valeurs.get((service, cle))


@pytest.fixture
def keyring_factice(monkeypatch):
    factice = _KeyringFactice()
    monkeypatch.setattr(credentials, "keyring", factice)
    return factice


def test_enregistrer_puis_obtenir_identifiants_nominal(keyring_factice):
    credentials.enregistrer_identifiants("test@exemple.fr", "motdepasse123")
    assert credentials.obtenir_identifiants() == ("test@exemple.fr", "motdepasse123")


def test_obtenir_identifiants_aucun_enregistre(keyring_factice):
    assert credentials.obtenir_identifiants() == (None, None)


def test_obtenir_identifiants_email_present_mais_mot_de_passe_absent(keyring_factice):
    """Cas limite : l'email est enregistré mais pas le mot de passe (état incohérent)."""
    keyring_factice.set_password(credentials.SERVICE_NAME, credentials.EMAIL_KEY, "test@exemple.fr")
    assert credentials.obtenir_identifiants() == (None, None)


def test_enregistrer_identifiants_ecrase_les_precedents(keyring_factice):
    credentials.enregistrer_identifiants("ancien@exemple.fr", "ancien")
    credentials.enregistrer_identifiants("nouveau@exemple.fr", "nouveau")
    assert credentials.obtenir_identifiants() == ("nouveau@exemple.fr", "nouveau")


def test_identifiants_configures_faux_par_defaut(keyring_factice):
    assert credentials.identifiants_configures() is False


def test_identifiants_configures_vrai_apres_enregistrement(keyring_factice):
    credentials.enregistrer_identifiants("test@exemple.fr", "motdepasse123")
    assert credentials.identifiants_configures() is True
