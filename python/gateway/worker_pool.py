"""Un sous-processus persistant par agent (réutilisé entre appels - pas
relancé à chaque requête, pour ne pas recharger spaCy à chaque fois),
communiquant par lignes JSON sur stdin/stdout (voir worker_main.py).
Isole totalement les agents entre eux (mémoire, sys.modules), quel que
soit le nombre d'agents installés sous python/agents/.
"""
from __future__ import annotations

import json
import subprocess
import sys
import threading
from pathlib import Path
from typing import Any

from registry import AgentDescriptor

WORKER_SCRIPT = Path(__file__).resolve().parent / "worker_main.py"


class AgentWorker:
    def __init__(self, agent: AgentDescriptor) -> None:
        self._agent = agent
        self._lock = threading.Lock()
        self._process: subprocess.Popen[str] | None = None

    def _ensure_started(self) -> subprocess.Popen[str]:
        if self._process is not None and self._process.poll() is None:
            return self._process
        process = subprocess.Popen(
            [sys.executable, str(WORKER_SCRIPT), str(self._agent.root)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        assert process.stdout is not None
        ready = process.stdout.readline()
        if ready.strip() != "READY":
            stderr = process.stderr.read() if process.stderr else ""
            process.kill()
            raise RuntimeError(
                f"Le worker de l'agent '{self._agent.agent_id}' n'a pas démarré : {stderr}"
            )
        self._process = process
        return process

    def run(self, command: str, fields: dict[str, Any], files: dict[str, list[Path]]) -> dict[str, Any]:
        with self._lock:
            process = self._ensure_started()
            assert process.stdin is not None and process.stdout is not None
            request = {
                "command": command,
                "fields": fields,
                "files": {key: [str(p) for p in paths] for key, paths in files.items()},
            }
            process.stdin.write(json.dumps(request) + "\n")
            process.stdin.flush()
            line = process.stdout.readline()
            if not line:
                stderr = process.stderr.read() if process.stderr else ""
                self._process = None
                raise RuntimeError(
                    f"Le worker de l'agent '{self._agent.agent_id}' s'est arrêté de façon inattendue : {stderr}"
                )
            response = json.loads(line)

        if not response.get("ok"):
            raise RuntimeError(response.get("error", "Erreur inconnue du worker."))
        return response["result"]

    def stop(self) -> None:
        with self._lock:
            if self._process is not None and self._process.poll() is None:
                self._process.terminate()
            self._process = None


_workers: dict[str, AgentWorker] = {}
_workers_lock = threading.Lock()


def get_worker(agent: AgentDescriptor) -> AgentWorker:
    with _workers_lock:
        worker = _workers.get(agent.agent_id)
        if worker is None:
            worker = AgentWorker(agent)
            _workers[agent.agent_id] = worker
        return worker


def stop_all_workers() -> None:
    with _workers_lock:
        for worker in _workers.values():
            worker.stop()
        _workers.clear()
