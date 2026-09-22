"""Adaptateur web écrit par la plateforme EJAH pour brancher le cœur
voyages (app/service.py, livré par Cédric Houpe) sur la gateway Python
générique (python/gateway/). Ce fichier ne fait PAS partie du paquet
livré : il n'est jamais synchronisé avec le dépôt source, à la différence
de app/, contract.yaml, manifest.yaml.

Contrat attendu par la gateway : une fonction run(command, fields, files)
qui reçoit les champs scalaires/JSON et les fichiers uploadés (aucun pour
cet agent) nommés d'après les propriétés du contract.yaml, et renvoie un
dict sérialisable correspondant à la section `output` du contract.yaml.
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any

from app.service import AgentRequest, execute

# Convention partagée avec python/gateway/main.py (endpoint générique
# GET /agents/{agent_id}/progress) : ce fichier n'a aucune notion HTTP, il
# écrit juste un état opaque que la gateway relit telle quelle.
_PROGRESS_FILE = Path(tempfile.gettempdir()) / "ejah-agent-progress" / "voyages.json"


def _write_progress(state: str | None) -> None:
    if state is None:
        _PROGRESS_FILE.unlink(missing_ok=True)
        return
    _PROGRESS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _PROGRESS_FILE.write_text(json.dumps({"state": state}), encoding="utf-8")


def run(command: str, fields: dict[str, Any], files: dict[str, list[Path]]) -> dict[str, Any]:
    _write_progress(None)
    request = AgentRequest(
        command=command,  # type: ignore[arg-type]
        email=fields.get("email") or None,
        mot_de_passe=fields.get("mot_de_passe") or None,
        headless=bool(fields.get("headless") or False),
        voyages=fields.get("voyages") or None,
        on_progress=_write_progress if command == "recuperer" else None,
    )
    try:
        response = execute(request)
    finally:
        _write_progress(None)

    return {
        "command": response.command,
        "message": response.message,
        "configures": response.configures,
        "voyages": response.voyages,
        "ics_contenu": response.ics_contenu,
        "error": response.error,
        "error_kind": response.error_kind,
    }
