"""Gateway HTTP générique pour les agents Python d'EJAH.

Un seul processus, un seul port par environnement (voir python/gateway/run.py
et config/.env.*.example : GATEWAY_PORT), quel que soit le nombre d'agents
Python installés sous python/agents/. Chaque agent apporte son propre
contract.yaml (source de vérité des champs attendus) et son propre
web_adapter.py (traduction vers son entrypoint propre) - cette gateway ne
connaît la sémantique d'aucun agent en particulier.

Appelée uniquement par le serveur Next.js (src/integrations/), jamais
exposée au navigateur : liée à 127.0.0.1 uniquement (voir run.py).
"""
from __future__ import annotations

import asyncio
import json
import re
import shutil
import tempfile
import time
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from starlette.datastructures import UploadFile as StarletteUploadFile

from registry import discover_agents
from worker_pool import get_worker, stop_all_workers

app = FastAPI(title="EJAH - Gateway agents Python", version="1.0.0")

GATEWAY_TEMP_ROOT = Path(tempfile.gettempdir()) / "ejah-python-agent-gateway"
GATEWAY_TEMP_ROOT.mkdir(parents=True, exist_ok=True)
_MAX_TEMP_DIR_AGE_SECONDS = 24 * 3600
_REQUEST_ID_RE = re.compile(r"^[0-9a-f]{32}$")

# Canal générique optionnel : un web_adapter.run() long (ex. voyages/recuperer,
# plusieurs minutes) peut écrire son état ici pendant qu'il tourne dans son
# thread ; ce endpoint ne connaît pas le sens du contenu, il le relit tel
# quel - un agent qui n'écrit jamais ici répond simplement {"state": null}.
PROGRESS_ROOT = Path(tempfile.gettempdir()) / "ejah-agent-progress"
_AGENT_ID_RE = re.compile(r"^[a-zA-Z0-9_-]+$")


def _cleanup_old_requests() -> None:
    now = time.time()
    for child in GATEWAY_TEMP_ROOT.iterdir():
        if child.is_dir() and (now - child.stat().st_mtime) > _MAX_TEMP_DIR_AGE_SECONDS:
            shutil.rmtree(child, ignore_errors=True)


@app.on_event("startup")
def _startup() -> None:
    _cleanup_old_requests()


@app.on_event("shutdown")
def _shutdown() -> None:
    stop_all_workers()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/agents/{agent_id}/progress")
def agent_progress(agent_id: str) -> dict[str, Any]:
    if not _AGENT_ID_RE.match(agent_id):
        raise HTTPException(status_code=404, detail=f"Agent inconnu : {agent_id!r}")
    path = PROGRESS_ROOT / f"{agent_id}.json"
    if not path.is_file():
        return {"state": None}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"state": None}


@app.get("/agents")
def list_agents() -> list[dict[str, Any]]:
    agents = discover_agents()
    return [
        {
            "id": agent.agent_id,
            "name": agent.name,
            "description": agent.description,
            "version": agent.manifest["agent"].get("version"),
            "commands": agent.commands,
            "access_control": agent.manifest.get("access_control"),
        }
        for agent in agents.values()
    ]


@app.post("/agents/{agent_id}/execute")
async def execute_agent(agent_id: str, request: Request) -> JSONResponse:
    agents = discover_agents()
    agent = agents.get(agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail=f"Agent inconnu : {agent_id!r}")

    form = await request.form()

    request_id = uuid.uuid4().hex
    work_dir = GATEWAY_TEMP_ROOT / request_id
    work_dir.mkdir(parents=True)

    artifact_names = agent.artifact_fields()
    scalar_names = agent.scalar_fields()
    json_names = agent.json_fields()

    fields: dict[str, Any] = {}
    files: dict[str, list[Path]] = {}

    try:
        for key in form.keys():
            values = form.getlist(key)
            if key in artifact_names:
                saved_paths: list[Path] = []
                for value in values:
                    if not isinstance(value, StarletteUploadFile):
                        continue
                    dest = work_dir / Path(value.filename or "fichier").name
                    with dest.open("wb") as out:
                        shutil.copyfileobj(value.file, out)
                    saved_paths.append(dest)
                files[key] = saved_paths
            elif key in json_names:
                raw = values[0]
                try:
                    fields[key] = json.loads(raw) if isinstance(raw, str) else raw
                except json.JSONDecodeError as exc:
                    raise HTTPException(
                        status_code=400, detail=f"Champ '{key}' : JSON invalide ({exc})."
                    ) from exc
            elif key in scalar_names or key == "command":
                raw = values[0]
                if isinstance(raw, str) and raw.lower() in ("true", "false"):
                    fields[key] = raw.lower() == "true"
                else:
                    fields[key] = raw

        command = fields.pop("command", None)
        if not command:
            raise HTTPException(status_code=400, detail="Le champ 'command' est requis.")

        worker = get_worker(agent)
        try:
            # Exécuté dans un thread séparé : certains agents (ex. voyages -
            # session Chrome interactive) peuvent bloquer plusieurs minutes,
            # ce qui gèlerait toute la gateway (tous agents confondus) si
            # exécuté directement dans la boucle asyncio.
            result = await asyncio.to_thread(worker.run, command, fields, files)
        except Exception as exc:  # noqa: BLE001 - erreur agent renvoyée telle quelle
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        shutil.rmtree(work_dir, ignore_errors=True)
        raise

    # Réécrit les chemins de sortie locaux en URLs de téléchargement : on
    # n'expose jamais un chemin de fichier serveur à l'appelant HTTP.
    for item in result.get("results", []):
        output = item.get("output")
        if output:
            output_path = Path(output)
            if output_path.parent != work_dir and output_path.is_file():
                dest = work_dir / output_path.name
                shutil.copy2(output_path, dest)
                output_path = dest
            item["output"] = None
            item["download_url"] = f"/agents/{agent_id}/download/{request_id}/{output_path.name}"

    vault_path = result.get("vault_path")
    if vault_path:
        vault_file = Path(vault_path)
        if vault_file.parent != work_dir and vault_file.is_file():
            dest = work_dir / vault_file.name
            shutil.copy2(vault_file, dest)
            vault_file = dest
        result["vault_path"] = None
        result["vault_download_url"] = f"/agents/{agent_id}/download/{request_id}/{vault_file.name}"

    return JSONResponse(result)


@app.get("/agents/{agent_id}/download/{request_id}/{filename}")
def download_artifact(agent_id: str, request_id: str, filename: str) -> FileResponse:
    if not _REQUEST_ID_RE.match(request_id):
        raise HTTPException(status_code=404, detail="Fichier introuvable ou expiré.")
    work_dir = (GATEWAY_TEMP_ROOT / request_id).resolve()
    target = (work_dir / Path(filename).name).resolve()
    if work_dir.parent != GATEWAY_TEMP_ROOT.resolve() or not str(target).startswith(str(work_dir)):
        raise HTTPException(status_code=404, detail="Fichier introuvable ou expiré.")
    if not target.is_file():
        raise HTTPException(status_code=404, detail="Fichier introuvable ou expiré.")
    return FileResponse(target, filename=filename)
