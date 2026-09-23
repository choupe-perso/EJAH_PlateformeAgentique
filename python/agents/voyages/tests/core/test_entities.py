# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Tests pour app/domain/entities.py : validation d'un voyage et calcul
de l'année. Migré depuis l'ancienne plateforme Flask
(tests/test_generateur_ics_sncf_scraping.py, partie non liée au
navigateur), adapté à la signature pure de annee_pour (date injectée en
paramètre plutôt que monkeypatchée)."""

from datetime import date

from app.domain.entities import annee_pour, valider_voyage

CHAMPS_VOYAGE_NOMINAL = {
    "id": "DOSSIER1_20260910_1234",
    "dossier": "DOSSIER1",
    "annee": 2026,
    "mois": 9,
    "jour": 10,
    "heure_depart": [14, 30],
    "heure_arrivee": [16, 45],
    "gare_depart": "Paris Gare de Lyon",
    "gare_arrivee": "Lyon Part-Dieu",
    "train_numero": "TGV N°6607",
    "duree": "2H15",
}


def test_valider_voyage_nominal():
    assert valider_voyage(dict(CHAMPS_VOYAGE_NOMINAL)) is True


def test_valider_voyage_champ_manquant():
    voyage = dict(CHAMPS_VOYAGE_NOMINAL)
    del voyage["train_numero"]
    assert valider_voyage(voyage) is False


def test_valider_voyage_pas_un_dict():
    assert valider_voyage(["pas", "un", "dict"]) is False
    assert valider_voyage(None) is False


def test_annee_pour_date_future_cette_annee():
    assert annee_pour(6, 15, aujourdhui=date(2026, 1, 1)) == 2026


def test_annee_pour_date_passee_bascule_annee_suivante():
    """Cas limite : un jour/mois déjà passé cette année (voyage récurrent affiché
    sans année) doit être interprété comme l'année suivante."""
    assert annee_pour(1, 10, aujourdhui=date(2026, 9, 5)) == 2027


def test_annee_pour_aujourdhui_meme_jour():
    """Cas limite : le jour même n'est pas considéré comme passé."""
    assert annee_pour(9, 5, aujourdhui=date(2026, 9, 5)) == 2026
