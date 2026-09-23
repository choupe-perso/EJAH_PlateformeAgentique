# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
from app.domain.entities import valider_email, valider_prompt, valider_rdv, valider_tache


def test_valider_rdv_accepte_donnees_completes() -> None:
    erreurs = valider_rdv(
        {"titre": "RDV dentiste", "dateDebut": "2026-10-01T09:00", "dureeMinutes": "60", "alerteMinutes": "30"}
    )
    assert erreurs == []


def test_valider_rdv_rejette_alerte_hors_liste() -> None:
    erreurs = valider_rdv(
        {"titre": "RDV", "dateDebut": "2026-10-01T09:00", "dureeMinutes": "60", "alerteMinutes": "15"}
    )
    assert any("alerte" in e.lower() for e in erreurs)


def test_valider_rdv_rejette_duree_negative() -> None:
    erreurs = valider_rdv(
        {"titre": "RDV", "dateDebut": "2026-10-01T09:00", "dureeMinutes": "-5", "alerteMinutes": "30"}
    )
    assert any("durée" in e.lower() or "duree" in e.lower() for e in erreurs)


def test_valider_email_exige_destinataire_titre_texte() -> None:
    erreurs = valider_email({})
    assert len(erreurs) == 3


def test_valider_email_accepte_donnees_completes() -> None:
    erreurs = valider_email({"destinataire": "Marc", "titre": "Objet", "texte": "Bonjour"})
    assert erreurs == []


def test_valider_prompt_rejette_ia_inconnue() -> None:
    erreurs = valider_prompt({"ia": "bard", "projet": "X", "titre": "T", "texte": "..."})
    assert any("ia cible" in e.lower() for e in erreurs)


def test_valider_prompt_accepte_ia_valide() -> None:
    erreurs = valider_prompt({"ia": "claude", "projet": "X", "titre": "T", "texte": "..."})
    assert erreurs == []


def test_valider_tache_type_inconnu() -> None:
    erreurs = valider_tache("inconnu", {})
    assert len(erreurs) == 1
    assert "inconnu" in erreurs[0].lower()
