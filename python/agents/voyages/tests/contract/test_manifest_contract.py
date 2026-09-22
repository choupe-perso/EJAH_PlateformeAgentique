# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
from pathlib import Path

import pytest

yaml = pytest.importorskip("yaml")

AGENT_ROOT = Path(__file__).resolve().parents[2]


def test_manifest_declares_mandatory_cli_capability() -> None:
    manifest = yaml.safe_load((AGENT_ROOT / "manifest.yaml").read_text(encoding="utf-8"))
    assert manifest["agent"]["id"] == "voyages"
    assert manifest["capabilities"]["cli"] is True
    assert manifest["entrypoint"]["module"] == "app.service"
    assert manifest["entrypoint"]["function"] == "execute"


def test_contract_describes_inputs_and_outputs() -> None:
    contract = yaml.safe_load((AGENT_ROOT / "contract.yaml").read_text(encoding="utf-8"))
    assert "command" in contract["input"]["required"]
    assert contract["output"]["required"] == ["message"]
