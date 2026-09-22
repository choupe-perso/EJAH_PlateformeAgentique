# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
from pathlib import Path

from app.domain.entities import EntityType
from app.domain.vault import Vault


def test_tokenize_shares_one_token_across_case_variants(tmp_path: Path) -> None:
    vault = Vault(tmp_path / "vault.db", "pw")
    try:
        token_upper = vault.tokenize(EntityType.PERSONNE, "Lara")
        token_lower = vault.tokenize(EntityType.PERSONNE, "lara")
        assert token_upper == token_lower
        # La casse restituee est celle de la PREMIERE occurrence tokenisee -
        # compromis assume (voir la docstring de Vault.tokenize).
        assert vault.resolve(token_upper) == "Lara"
    finally:
        vault.close()


def test_tokenize_keeps_distinct_values_apart(tmp_path: Path) -> None:
    vault = Vault(tmp_path / "vault.db", "pw")
    try:
        token_a = vault.tokenize(EntityType.PERSONNE, "Mohamed M.")
        token_b = vault.tokenize(EntityType.PERSONNE, "Mohamed S.")
        assert token_a != token_b
        assert vault.resolve(token_a) == "Mohamed M."
        assert vault.resolve(token_b) == "Mohamed S."
    finally:
        vault.close()
