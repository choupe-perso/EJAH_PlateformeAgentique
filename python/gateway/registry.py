"""Découverte des agents Python installés sous python/agents/*/.

Chaque agent installé y a son manifest.yaml et son contract.yaml (livrés
tels quels par leur fournisseur, jamais modifiés) plus un web_adapter.py
écrit par la plateforme EJAH (jamais synchronisé avec le fournisseur) qui
traduit le contrat générique (fields/files) vers l'entrypoint propre à
l'agent.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

AGENTS_ROOT = Path(__file__).resolve().parent.parent / "agents"


@dataclass
class AgentDescriptor:
    agent_id: str
    manifest: dict[str, Any]
    contract: dict[str, Any]
    root: Path

    @property
    def name(self) -> str:
        return self.manifest["agent"].get("name", self.agent_id)

    @property
    def description(self) -> str:
        return self.manifest["agent"].get("description", "")

    @property
    def commands(self) -> list[str]:
        return [c["id"] for c in self.manifest.get("commands", [])]

    def _input_properties(self) -> dict[str, Any]:
        return self.contract.get("input", {}).get("properties", {})

    def artifact_fields(self) -> set[str]:
        result = set()
        for prop_name, spec in self._input_properties().items():
            prop_type = spec.get("type")
            if prop_type == "artifact":
                result.add(prop_name)
            elif prop_type == "collection" and spec.get("items", {}).get("type") == "artifact":
                result.add(prop_name)
        return result

    def scalar_fields(self) -> set[str]:
        return {
            name
            for name, spec in self._input_properties().items()
            if spec.get("type") == "scalar"
        }

    def json_fields(self) -> set[str]:
        """Champs `collection` dont les éléments ne sont pas des `artifact`
        (ex. liste d'objets métier) : transmis en form-data comme un champ
        texte JSON-encodé, décodé ici avant d'être passé à web_adapter.run."""
        result = set()
        for prop_name, spec in self._input_properties().items():
            if spec.get("type") == "collection" and spec.get("items", {}).get("type") != "artifact":
                result.add(prop_name)
        return result


def discover_agents() -> dict[str, AgentDescriptor]:
    agents: dict[str, AgentDescriptor] = {}
    if not AGENTS_ROOT.exists():
        return agents
    for agent_dir in sorted(AGENTS_ROOT.iterdir()):
        manifest_path = agent_dir / "manifest.yaml"
        contract_path = agent_dir / "contract.yaml"
        adapter_path = agent_dir / "web_adapter.py"
        if not (manifest_path.exists() and contract_path.exists() and adapter_path.exists()):
            continue
        manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
        contract = yaml.safe_load(contract_path.read_text(encoding="utf-8"))
        agent_id = manifest["agent"]["id"]
        agents[agent_id] = AgentDescriptor(
            agent_id=agent_id, manifest=manifest, contract=contract, root=agent_dir
        )
    return agents
