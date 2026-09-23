# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Interface stable du Core de l'agent taches : execute(request) ->
response. Aucune logique de canal ici (pas de console, pas d'argparse) -
un adaptateur (WEB aujourd'hui, via web_adapter.py) convertit son entrée
propre en AgentRequest, appelle execute(), puis restitue l'AgentResponse
selon son canal.

La persistance des tâches (création, liste, statut, historique) est du
ressort de la plateforme (base de données) - ce cœur ne stocke rien,
comme l'agent voyages."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

from app.domain.entities import valider_tache
from app.domain.ics import construire_ics_rdv
from app.integrations.ollama.client import OllamaError
from app.integrations.ollama.redaction import (
    rediger_email,
    rediger_prompt,
    reecrire_email,
    reecrire_prompt,
)

Command = Literal["valider", "rediger_brouillon", "reecrire_brouillon", "generer_ics"]
TypeTache = Literal["rdv", "email", "prompt"]
ErrorKind = Literal["validation", "configuration", "integration", "technique"]


@dataclass
class AgentRequest:
    command: Command
    type: TypeTache | None = None
    id: str | None = None
    titre: str | None = None
    date_debut: str | None = None
    duree_minutes: str | None = None
    alerte_minutes: str | None = None
    description: str | None = None
    destinataire: str | None = None
    ia: str | None = None
    projet: str | None = None
    texte: str | None = None
    notes: str | None = None
    texte_actuel: str | None = None
    titre_actuel: str | None = None
    precisions: str | None = None
    registre: str | None = None
    ton: str | None = None
    longueur: str | None = None
    niveau: str | None = None

    def __post_init__(self) -> None:
        if self.command in ("valider", "rediger_brouillon", "reecrire_brouillon") and not self.type:
            raise ValueError(f"type est requis pour {self.command}.")


@dataclass
class AgentResponse:
    command: Command
    message: str
    erreurs: list[str] = field(default_factory=list)
    titre: str | None = None
    texte: str | None = None
    ics_contenu: str | None = None
    error: str | None = None
    error_kind: ErrorKind | None = None


def _donnees_pour_validation(request: AgentRequest) -> dict[str, object]:
    if request.type == "rdv":
        return {
            "titre": request.titre,
            "dateDebut": request.date_debut,
            "dureeMinutes": request.duree_minutes,
            "alerteMinutes": request.alerte_minutes,
        }
    if request.type == "email":
        return {"destinataire": request.destinataire, "titre": request.titre, "texte": request.texte}
    return {"ia": request.ia, "projet": request.projet, "titre": request.titre, "texte": request.texte}


def execute(request: AgentRequest) -> AgentResponse:
    if request.command == "valider":
        erreurs = valider_tache(request.type, _donnees_pour_validation(request))
        message = "Données exploitables." if not erreurs else f"{len(erreurs)} erreur(s) de validation."
        return AgentResponse(command=request.command, message=message, erreurs=erreurs)

    if request.command in ("rediger_brouillon", "reecrire_brouillon"):
        reecriture = request.command == "reecrire_brouillon"
        try:
            if request.type == "email":
                if reecriture:
                    titre, texte = reecrire_email(
                        destinataire=request.destinataire or "",
                        titre_actuel=request.titre_actuel or "",
                        texte_actuel=request.texte_actuel or "",
                        precisions=request.precisions or "",
                        registre=request.registre or "tutoiement",
                        ton=request.ton or "professionnel",
                        longueur=request.longueur or "court",
                    )
                else:
                    titre, texte = rediger_email(
                        destinataire=request.destinataire or "",
                        notes=request.notes or "",
                        registre=request.registre or "tutoiement",
                        ton=request.ton or "professionnel",
                        longueur=request.longueur or "court",
                    )
                return AgentResponse(command=request.command, message="Brouillon d'email généré.", titre=titre, texte=texte)

            if request.type == "prompt":
                if reecriture:
                    texte = reecrire_prompt(
                        ia=request.ia or "",
                        projet=request.projet or "",
                        titre=request.titre or "",
                        texte_actuel=request.texte_actuel or "",
                        precisions=request.precisions or "",
                        niveau=request.niveau or "structure",
                    )
                else:
                    texte = rediger_prompt(
                        ia=request.ia or "",
                        projet=request.projet or "",
                        titre=request.titre or "",
                        notes=request.notes or "",
                        niveau=request.niveau or "structure",
                    )
                return AgentResponse(command=request.command, message="Brouillon de prompt généré.", texte=texte)

            return AgentResponse(
                command=request.command,
                message="Génération du brouillon interrompue.",
                error=f"Type de tâche inconnu pour un brouillon : {request.type!r}.",
                error_kind="validation",
            )
        except OllamaError as exc:
            return AgentResponse(
                command=request.command,
                message="Génération du brouillon interrompue.",
                error=str(exc),
                error_kind="integration",
            )

    if request.command == "generer_ics":
        champs_requis = (request.titre, request.date_debut, request.duree_minutes, request.alerte_minutes)
        if not all(champs_requis):
            return AgentResponse(
                command=request.command,
                message="Génération du calendrier interrompue.",
                error="Titre, date de début, durée et alerte sont requis pour générer un .ics.",
                error_kind="validation",
            )
        try:
            date_debut = datetime.fromisoformat(request.date_debut)  # type: ignore[arg-type]
            duree_minutes = int(float(request.duree_minutes))  # type: ignore[arg-type]
            alerte_minutes = int(float(request.alerte_minutes))  # type: ignore[arg-type]
        except (TypeError, ValueError) as exc:
            return AgentResponse(
                command=request.command,
                message="Génération du calendrier interrompue.",
                error=f"Données de RDV invalides : {exc}",
                error_kind="validation",
            )
        contenu = construire_ics_rdv(
            identifiant=request.id or "sans-id",
            titre=request.titre,  # type: ignore[arg-type]
            date_debut=date_debut,
            duree_minutes=duree_minutes,
            alerte_minutes=alerte_minutes,
            description=request.description,
        )
        return AgentResponse(command=request.command, message="Calendrier .ics généré pour 1 RDV.", ics_contenu=contenu)

    raise ValueError(f"Commande inconnue : {request.command!r}")
