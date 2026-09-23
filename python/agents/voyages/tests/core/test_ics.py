# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Jeux de tests (nominaux, erreur, limites) pour app/domain/ics.py.
Migré depuis l'ancienne plateforme Flask
(tests/test_generateur_ics_sncf_ics.py), UID adapté au nouvel agent."""

from app.domain.ics import construire_ics, echapper_texte_ics, plier_ligne


def _voyage_nominal():
    return {
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


def test_construire_ics_structure_nominal():
    contenu = construire_ics([_voyage_nominal()])
    assert contenu.startswith("BEGIN:VCALENDAR\r\n")
    assert contenu.rstrip("\r\n").endswith("END:VCALENDAR")
    assert "BEGIN:VEVENT\r\n" in contenu
    assert "END:VEVENT\r\n" in contenu
    assert "DTSTART:20260910T143000\r\n" in contenu
    assert "DTEND:20260910T164500\r\n" in contenu
    assert "LOCATION:Paris Gare de Lyon\r\n" in contenu
    assert "SUMMARY:Train Paris Gare de Lyon → Lyon Part-Dieu (TGV N°6607)\r\n" in contenu


def test_construire_ics_un_voyage_donne_deux_vevent():
    """Chaque voyage doit produire deux créneaux : le "Trajet" et le voyage lui-même."""
    contenu = construire_ics([_voyage_nominal()])
    assert contenu.count("BEGIN:VEVENT") == 2
    assert contenu.count("END:VEVENT") == 2


def test_construire_ics_plusieurs_voyages_donne_plusieurs_vevent():
    voyages = [_voyage_nominal(), _voyage_nominal()]
    contenu = construire_ics(voyages)
    assert contenu.count("BEGIN:VEVENT") == 4
    assert contenu.count("END:VEVENT") == 4


def test_construire_ics_trajet_1h_avant_le_depart():
    contenu = construire_ics([_voyage_nominal()])
    assert "SUMMARY:Trajet\r\n" in contenu
    assert "DTSTART:20260910T133000\r\n" in contenu
    assert "DTEND:20260910T143000\r\n" in contenu


def test_construire_ics_trajet_bascule_a_la_veille_si_depart_apres_minuit():
    """Cas limite : un départ juste après minuit doit faire démarrer le "Trajet" la veille."""
    voyage = _voyage_nominal()
    voyage["heure_depart"] = [0, 30]
    voyage["heure_arrivee"] = [2, 45]
    contenu = construire_ics([voyage])
    assert "DTSTART:20260909T233000\r\n" in contenu
    assert "DTEND:20260910T003000\r\n" in contenu


def test_construire_ics_trajet_uid_distinct_du_voyage():
    contenu = construire_ics([_voyage_nominal()])
    assert "voyages-DOSSIER1_20260910_1234-trajet-" in contenu


def test_construire_ics_rappel_1h_sur_les_deux_creneaux():
    """Le "Trajet" et le voyage doivent chacun avoir un rappel (VALARM) 1h avant leur début."""
    contenu = construire_ics([_voyage_nominal()])
    assert contenu.count("BEGIN:VALARM") == 2
    assert contenu.count("END:VALARM") == 2
    assert contenu.count("TRIGGER:-PT1H\r\n") == 2
    assert contenu.count("ACTION:DISPLAY\r\n") == 2


def test_construire_ics_rappel_du_trajet_reprend_son_titre():
    contenu = construire_ics([_voyage_nominal()])
    premier_vevent = contenu.split("BEGIN:VEVENT", 2)[1]
    assert "SUMMARY:Trajet\r\n" in premier_vevent
    assert "ACTION:DISPLAY\r\nDESCRIPTION:Trajet\r\nTRIGGER:-PT1H\r\n" in premier_vevent


def test_construire_ics_rappel_du_voyage_reprend_le_resume_du_train():
    contenu = construire_ics([_voyage_nominal()])
    assert "DESCRIPTION:Train Paris Gare de Lyon → Lyon Part-Dieu (TGV N°6607)\r\nTRIGGER:-PT1H\r\n" in contenu


def test_construire_ics_liste_vide_donne_calendrier_sans_evenement():
    """Cas limite : une liste vide doit tout de même produire un .ics valide (sans VEVENT)."""
    contenu = construire_ics([])
    assert contenu.startswith("BEGIN:VCALENDAR\r\n")
    assert contenu.rstrip("\r\n").endswith("END:VCALENDAR")
    assert "VEVENT" not in contenu


def test_construire_ics_arrivee_le_lendemain():
    """Cas limite : un voyage de nuit (arrivée avant le départ en heure locale) doit basculer au jour suivant."""
    voyage = _voyage_nominal()
    voyage["heure_depart"] = [23, 30]
    voyage["heure_arrivee"] = [1, 15]
    contenu = construire_ics([voyage])
    assert "DTSTART:20260910T233000\r\n" in contenu
    assert "DTEND:20260911T011500\r\n" in contenu


def test_construire_ics_echappe_les_gares():
    voyage = _voyage_nominal()
    voyage["gare_depart"] = "Paris, Gare; du Nord"
    contenu = construire_ics([voyage])
    assert "LOCATION:Paris\\, Gare\\; du Nord\r\n" in contenu


def test_construire_ics_deux_appels_donnent_des_uid_differents():
    """Chaque export doit avoir un UID unique, même pour le même voyage."""
    voyage = _voyage_nominal()
    premier = construire_ics([voyage])
    second = construire_ics([voyage])
    assert premier != second


def test_echapper_texte_ics_reexporte_conforme():
    """Vérifie que l'échappement RFC 5545 réutilisé se comporte comme prévu."""
    assert echapper_texte_ics("a, b; c\\d\ne") == "a\\, b\\; c\\\\d\\ne"


def test_plier_ligne_reexportee_conforme():
    ligne = "X" * 76
    repliee = plier_ligne(ligne)
    assert repliee != ligne
    assert "\r\n " in repliee
