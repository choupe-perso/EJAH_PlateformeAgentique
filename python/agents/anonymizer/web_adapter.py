"""Adaptateur web écrit par la plateforme EJAH pour brancher le cœur
anonymizer (app/service.py, livré par ADBI) sur la gateway Python
générique (python/gateway/). Ce fichier ne fait PAS partie du paquet
livré : il n'est jamais synchronisé avec le dépôt source ADBI, à la
différence de app/, contract.yaml, manifest.yaml.

Contrat attendu par la gateway : une fonction run(command, fields, files)
qui reçoit les champs scalaires et les fichiers uploadés (déjà écrits sur
disque) nommés d'après les propriétés du contract.yaml, et renvoie un
dict sérialisable correspondant à la section `output` du contract.yaml.
"""
from __future__ import annotations

import os
import secrets
import tempfile
from pathlib import Path
from typing import Any

from app.service import AgentRequest, execute


def _new_temp_vault_path() -> Path:
    """Vault jetable (mode irreversible) : nom sans importance, supprimé
    juste après usage, jamais exposé à l'utilisateur."""
    fd, name = tempfile.mkstemp(suffix=".vault.db")
    os.close(fd)
    path = Path(name)
    path.unlink()  # Vault() crée le fichier lui-même à l'ouverture
    return path


def _new_named_vault_path(documents: list[Path]) -> Path:
    """Vault persistant : nommé d'après le premier document traité, dans le
    même répertoire (celui de la requête), pour que le fichier téléchargé
    soit reconnaissable plutôt qu'un nom temporaire aléatoire."""
    if documents:
        base_name = documents[0].stem
        directory = documents[0].parent
    else:
        base_name = "vault"
        directory = Path(tempfile.gettempdir())
    path = directory / f"{base_name}.vault.db"
    counter = 2
    while path.exists():
        path = directory / f"{base_name}_{counter}.vault.db"
        counter += 1
    return path


def run(command: str, fields: dict[str, Any], files: dict[str, list[Path]]) -> dict[str, Any]:
    documents = files.get("documents", [])
    vault_files = files.get("vault", [])
    vault_path: Path | None = vault_files[0] if vault_files else None
    passphrase: str | None = fields.get("passphrase") or None
    irreversible = bool(fields.get("irreversible") or False)
    out = fields.get("out") or None
    out_path = Path(out) if out else None

    temp_vault: Path | None = None
    try:
        if command == "deanonymize" and vault_path is None:
            raise ValueError("Un vault existant (fichier 'vault') est requis pour deanonymize.")

        if command == "anonymize" and irreversible:
            if vault_path is not None or passphrase is not None:
                raise ValueError(
                    "irreversible ne doit pas être combiné avec un vault ou une passphrase."
                )
            temp_vault = _new_temp_vault_path()
            vault_path = temp_vault
            passphrase = secrets.token_urlsafe(32)
        elif command == "anonymize" and vault_path is None and passphrase is not None:
            # Pas de vault fourni : première anonymisation, un nouveau vault est créé.
            vault_path = _new_named_vault_path(documents)

        request = AgentRequest(
            command=command,  # type: ignore[arg-type]
            input_paths=documents,
            vault_path=vault_path,
            passphrase=passphrase,
            out_path=out_path,
        )
        response = execute(request)

        return {
            "command": response.command,
            "message": response.message,
            "results": [
                {
                    "input": str(r.input_path),
                    "output": str(r.output_path) if r.output_path else None,
                    "entities_count": len(r.spans),
                    "error": r.error,
                }
                for r in response.results
            ],
            # Uniquement pour anonymize : deanonymize ne modifie pas le vault
            # fourni, inutile de le representer au telechargement.
            "vault_path": str(vault_path)
            if (command == "anonymize" and not irreversible)
            else None,
        }
    finally:
        if temp_vault is not None and temp_vault.exists():
            temp_vault.unlink()
