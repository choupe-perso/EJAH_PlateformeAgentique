# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Non-regression tests for the anomalies listed in
diagnostic_erreurs_anonymisation.md (real-world manual test against a
complex source document) - one test per reported anomaly, plus a strict
round-trip test (anonymize then deanonymize reproduces the source
exactly)."""
from pathlib import Path

from app.domain.engine import AnonymizationEngine, detect_only
from app.domain.entities import EntityType
from app.domain.vault import Vault


def test_repeated_password_is_anonymized_at_every_occurrence() -> None:
    text = (
        'Son mot de passe temporaire « DnV!2026-Reset#09 » avait été généré. '
        "Change ton mot de passe tout de suite. "
        "Et surtout ne réutilise pas DnV!2026-Reset#09 ailleurs."
    )
    spans = detect_only(text)
    passwords = [s for s in spans if s.entity_type == EntityType.MOT_DE_PASSE]
    assert len(passwords) == 2
    assert all(s.text == "DnV!2026-Reset#09" for s in passwords)


def test_common_determiner_ton_is_never_tagged_as_personne() -> None:
    text = (
        "Julien reçut un message. « Ton compte a été utilisé hier à 22 h 17 », "
        "lui expliqua Hugo. Change ton mot de passe tout de suite."
    )
    spans = detect_only(text)
    assert not any(
        s.entity_type == EntityType.PERSONNE and s.text.casefold() == "ton" for s in spans
    )


def test_chez_employeur_span_stops_before_trailing_clause() -> None:
    text = (
        "il arriva chez DataNova Consulting au volant de son Peugeot 3008 "
        "bleu nuit, immatriculé GA-428-NL."
    )
    spans = detect_only(text)
    employeurs = [s for s in spans if s.entity_type == EntityType.EMPLOYEUR]
    assert len(employeurs) == 1
    assert employeurs[0].text == "DataNova Consulting"


def test_birthplace_span_does_not_cross_sentence_boundary() -> None:
    text = (
        "Thomas Renard était né le 22 juin 1987 à Bruxelles. "
        "De nationalité belge, il vivait en France depuis huit ans."
    )
    spans = detect_only(text)
    lieux = [s for s in spans if s.entity_type == EntityType.LIEU_NAISSANCE]
    assert any(s.text == "Bruxelles" for s in lieux)
    assert not any("nationalité" in s.text.casefold() for s in spans)


def test_political_campaign_mention_is_detected() -> None:
    text = (
        "Il avait mentionné avoir participé bénévolement à la campagne "
        "d'un candidat écologiste lors des élections municipales de 2020."
    )
    spans = detect_only(text)
    assert any(
        s.entity_type == EntityType.OPINION_POLITIQUE and "candidat" in s.text.casefold()
        for s in spans
    )


def test_bare_technical_identifier_is_not_tagged_employeur() -> None:
    text = "Un post-it collé sous son écran indiquait encore « VPN : jmorel.ext »."
    spans = detect_only(text)
    assert any(s.entity_type == EntityType.IDENTIFIANT and s.text == "jmorel.ext" for s in spans)
    assert not any(s.entity_type == EntityType.EMPLOYEUR and s.text == "jmorel.ext" for s in spans)


def test_anonymize_then_deanonymize_reproduces_source_exactly(tmp_path: Path) -> None:
    source = (
        "Julien Morel, né le 22 juin 1987 à Bruxelles, joignable au "
        "06 72 48 19 35 ou par mail à julien.morel82@protonmail.com. "
        "Son mot de passe temporaire « DnV!2026-Reset#09 » ne doit être "
        "réutilisé nulle part - surtout pas DnV!2026-Reset#09."
    )
    vault = Vault(tmp_path / "vault.db", "pw")
    try:
        engine = AnonymizationEngine(vault)
        anonymized, spans = engine.anonymize(source)
        assert spans, "le texte de test doit produire au moins une détection"
        assert anonymized != source
        restored = engine.deanonymize(anonymized)
        assert restored == source
    finally:
        vault.close()
