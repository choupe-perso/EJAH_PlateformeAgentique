"""Point d'entrée d'un worker : lancé comme sous-processus dédié à UN SEUL
agent, pour que ses imports (typiquement un paquet top-level nommé `app`,
gabarit commun à plusieurs agents ADBI) ne collisionnent jamais avec ceux
d'un autre agent - chaque worker a son propre interpréteur, donc son
propre sys.modules.

Protocole : une requête JSON par ligne sur stdin
({"command", "fields", "files"}), une réponse JSON par ligne sur stdout
({"ok": true, "result": ...} ou {"ok": false, "error": "..."}). Aucun port
réseau ouvert par ce processus.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> None:
    agent_root = Path(sys.argv[1])
    sys.path.insert(0, str(agent_root))
    import web_adapter  # type: ignore  # module propre à l'agent, résolu via sys.path ci-dessus

    sys.stdout.write("READY\n")
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            request = json.loads(line)
            files = {
                key: [Path(p) for p in paths]
                for key, paths in request.get("files", {}).items()
            }
            result = web_adapter.run(request["command"], request.get("fields", {}), files)
            response: dict = {"ok": True, "result": result}
        except Exception as exc:  # noqa: BLE001 - renvoyé tel quel à la gateway
            response = {"ok": False, "error": str(exc)}
        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
