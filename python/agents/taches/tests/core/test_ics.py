# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
from datetime import datetime

from app.domain.ics import construire_ics_rdv, echapper_texte_ics, plier_ligne


def test_construire_ics_rdv_contient_un_seul_vevent() -> None:
    contenu = construire_ics_rdv(
        identifiant="abc123",
        titre="RDV dentiste",
        date_debut=datetime(2026, 10, 1, 9, 0, 0),
        duree_minutes=60,
        alerte_minutes=30,
    )
    assert contenu.count("BEGIN:VEVENT") == 1
    assert contenu.count("BEGIN:VALARM") == 1
    assert "DTSTART:20261001T090000" in contenu
    assert "DURATION:PT60M" in contenu
    assert "TRIGGER:-PT30M" in contenu
    assert "SUMMARY:RDV dentiste" in contenu
    assert contenu.endswith("\r\n")


def test_construire_ics_rdv_inclut_description_si_fournie() -> None:
    contenu = construire_ics_rdv(
        identifiant="abc123",
        titre="RDV",
        date_debut=datetime(2026, 10, 1, 9, 0, 0),
        duree_minutes=30,
        alerte_minutes=10,
        description="Apporter la carte vitale",
    )
    assert "DESCRIPTION:Apporter la carte vitale" in contenu


def test_echapper_texte_ics_echappe_les_caracteres_speciaux() -> None:
    assert echapper_texte_ics("a, b; c\\d\ne") == "a\\, b\\; c\\\\d\\ne"


def test_plier_ligne_replie_les_lignes_longues() -> None:
    ligne = "SUMMARY:" + "x" * 100
    pliee = plier_ligne(ligne)
    assert "\r\n " in pliee
    for morceau in pliee.split("\r\n "):
        assert len(morceau.encode("utf-8")) <= 75
