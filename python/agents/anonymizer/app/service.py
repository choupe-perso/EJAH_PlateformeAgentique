# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Interface stable du Core de l'agent anonymizer : execute(request) ->
response. Aucune logique de canal ici (pas de console, pas d'argparse, pas
de prompt interactif) - un adaptateur (CLI aujourd'hui, Web/API/MCP demain
si besoin) convertit son entrée propre en AgentRequest, appelle execute()
ou process_one(), puis restitue l'AgentResponse selon son canal."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal

from app.domain.span import Span
from app.domain.vault import Vault
from app.tools.formats.dispatch import get_handler

Command = Literal["inspect", "anonymize", "deanonymize"]


@dataclass
class AgentRequest:
    command: Command
    input_paths: list[Path]
    vault_path: str | Path | None = None
    passphrase: str | None = None
    out_path: Path | None = None

    def __post_init__(self) -> None:
        if self.out_path is not None and len(self.input_paths) > 1:
            raise ValueError("out_path n'est utilisable qu'avec un seul fichier en entrée.")
        if self.command != "inspect" and (self.vault_path is None or self.passphrase is None):
            raise ValueError("vault_path et passphrase sont requis pour anonymize/deanonymize.")


@dataclass
class FileResult:
    input_path: Path
    output_path: Path | None
    spans: list[Span] = field(default_factory=list)
    error: str | None = None


@dataclass
class AgentResponse:
    command: Command
    results: list[FileResult]
    message: str


def process_one(
    command: Command, path: Path, vault: Vault | None, out_path: Path | None
) -> FileResult:
    """Traite un seul fichier pour `command`, avec un `vault` déjà ouvert
    (sans objet pour un simple `inspect`, qui n'en a pas besoin). N'élève
    jamais d'exception pour un échec ponctuel : elle est portée par
    FileResult.error, pour qu'un traitement par lot puisse continuer sur
    les fichiers suivants après une erreur isolée."""
    try:
        handler = get_handler(path)
        if command == "inspect":
            spans = handler.inspect(path)
            return FileResult(input_path=path, output_path=None, spans=spans)
        if command == "anonymize":
            if vault is None:
                raise ValueError("anonymize requiert un vault ouvert.")
            result_path, spans = handler.anonymize(path, vault, out_path)
            return FileResult(input_path=path, output_path=result_path, spans=spans)
        if command == "deanonymize":
            if vault is None:
                raise ValueError("deanonymize requiert un vault ouvert.")
            if not hasattr(handler, "deanonymize"):
                return FileResult(
                    input_path=path,
                    output_path=None,
                    error=f"La restauration n'est pas supportée pour le format {path.suffix!r}.",
                )
            result_path = handler.deanonymize(path, vault, out_path)
            return FileResult(input_path=path, output_path=result_path, spans=[])
        raise ValueError(f"Commande inconnue : {command!r}")
    except Exception as exc:  # noqa: BLE001 - erreur portée par fichier, pas levée
        return FileResult(input_path=path, output_path=None, error=str(exc))


def execute(request: AgentRequest) -> AgentResponse:
    """Point d'entrée par lot, utilisable par tout canal qui n'a pas besoin
    d'un rapport de progression par fichier (l'adaptateur CLI appelle lui-
    même process_one() fichier par fichier, pour afficher son compteur de
    temps écoulé obligatoire)."""
    if request.command == "inspect":
        results = [process_one("inspect", p, None, None) for p in request.input_paths]
        total = sum(len(r.spans) for r in results)
        return AgentResponse(
            command="inspect",
            results=results,
            message=f"{total} entité(s) détectée(s) sur {len(results)} fichier(s).",
        )

    assert request.vault_path is not None and request.passphrase is not None
    with Vault(request.vault_path, request.passphrase) as vault:
        results = [
            process_one(request.command, p, vault, request.out_path)
            for p in request.input_paths
        ]

    ok = sum(1 for r in results if r.error is None)
    return AgentResponse(
        command=request.command,
        results=results,
        message=f"{ok}/{len(results)} fichier(s) traité(s) avec succès.",
    )
