"""Adaptateur web écrit par la plateforme EJAH pour brancher le cœur
taches (app/service.py, livré par Cédric Houpe) sur la gateway Python
générique (python/gateway/). Ce fichier ne fait PAS partie du paquet
livré : il n'est jamais synchronisé avec le dépôt source, à la différence
de app/, contract.yaml, manifest.yaml.

Contrat attendu par la gateway : une fonction run(command, fields, files)
qui reçoit les champs scalaires/JSON et les fichiers uploadés (aucun pour
cet agent) nommés d'après les propriétés du contract.yaml, et renvoie un
dict sérialisable correspondant à la section `output` du contract.yaml.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from app.service import AgentRequest, execute


def run(command: str, fields: dict[str, Any], files: dict[str, list[Path]]) -> dict[str, Any]:
    request = AgentRequest(
        command=command,  # type: ignore[arg-type]
        type=fields.get("type") or None,
        id=fields.get("id") or None,
        titre=fields.get("titre") or None,
        date_debut=fields.get("dateDebut") or None,
        duree_minutes=fields.get("dureeMinutes") or None,
        alerte_minutes=fields.get("alerteMinutes") or None,
        description=fields.get("description") or None,
        destinataire=fields.get("destinataire") or None,
        ia=fields.get("ia") or None,
        projet=fields.get("projet") or None,
        texte=fields.get("texte") or None,
        notes=fields.get("notes") or None,
        texte_actuel=fields.get("texteActuel") or None,
        titre_actuel=fields.get("titreActuel") or None,
        precisions=fields.get("precisions") or None,
        registre=fields.get("registre") or None,
        ton=fields.get("ton") or None,
        longueur=fields.get("longueur") or None,
        niveau=fields.get("niveau") or None,
    )
    response = execute(request)

    return {
        "command": response.command,
        "message": response.message,
        "erreurs": response.erreurs,
        "titre": response.titre,
        "texte": response.texte,
        "ics_contenu": response.ics_contenu,
        "error": response.error,
        "error_kind": response.error_kind,
    }
