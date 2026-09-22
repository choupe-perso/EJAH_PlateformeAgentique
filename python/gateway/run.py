"""Point d'entrée process : démarre la gateway sur le port de
l'environnement courant (variable GATEWAY_PORT - voir
config/.env.*.example), liée à 127.0.0.1 uniquement (jamais exposée hors
de la machine locale, appelée uniquement par le serveur Next.js)."""
from __future__ import annotations

import os

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("GATEWAY_PORT", "9010"))
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=False)
