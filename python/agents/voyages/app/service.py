# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Interface stable du Core de l'agent voyages : execute(request) ->
response. Aucune logique de canal ici (pas de console, pas d'argparse) -
un adaptateur (CLI aujourd'hui, WEB/API demain si besoin) convertit son
entrée propre en AgentRequest, appelle execute(), puis restitue
l'AgentResponse selon son canal."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Literal

from app.domain.entities import valider_voyage
from app.domain.ics import construire_ics
from app.integrations.sncf.credentials import (
    identifiants_configures,
    enregistrer_identifiants,
)
from app.integrations.sncf.scraping import recuperer_voyages

Command = Literal["identifiants_statut", "identifiants_definir", "recuperer", "generer"]
ErrorKind = Literal["validation", "configuration", "integration", "technique"]


@dataclass
class AgentRequest:
    command: Command
    email: str | None = None
    mot_de_passe: str | None = None
    headless: bool = False
    voyages: list[dict] | None = None
    on_progress: Callable[[str], None] | None = None

    def __post_init__(self) -> None:
        if self.command == "identifiants_definir" and (not self.email or not self.mot_de_passe):
            raise ValueError("email et mot_de_passe sont requis pour identifiants_definir.")
        if self.command == "generer" and not self.voyages:
            raise ValueError("voyages est requis (et non vide) pour generer.")


@dataclass
class AgentResponse:
    command: Command
    message: str
    configures: bool | None = None
    voyages: list[dict] | None = None
    ics_contenu: str | None = None
    error: str | None = None
    error_kind: ErrorKind | None = None


def execute(request: AgentRequest) -> AgentResponse:
    if request.command == "identifiants_statut":
        configures = identifiants_configures()
        return AgentResponse(
            command=request.command,
            message="Identifiants SNCF Connect enregistrés." if configures else "Identifiants SNCF Connect non enregistrés.",
            configures=configures,
        )

    if request.command == "identifiants_definir":
        assert request.email is not None and request.mot_de_passe is not None
        enregistrer_identifiants(request.email, request.mot_de_passe)
        return AgentResponse(
            command=request.command,
            message="Identifiants SNCF Connect enregistrés.",
            configures=True,
        )

    if request.command == "recuperer":
        # Les identifiants enregistrés (identifiants_definir) ne sont qu'un
        # auto-remplissage optionnel : recuperer_voyages gère très bien une
        # connexion 100% manuelle dans la fenêtre Chrome ouverte, donc leur
        # absence ne doit pas bloquer la commande.
        try:
            voyages = recuperer_voyages(headless=request.headless, on_progress=request.on_progress)
        except TimeoutError as exc:
            return AgentResponse(
                command=request.command,
                message="Récupération des voyages SNCF interrompue.",
                error=str(exc),
                error_kind="integration",
            )
        except Exception as exc:  # noqa: BLE001 - remonté comme erreur structurée
            return AgentResponse(
                command=request.command,
                message="Récupération des voyages SNCF interrompue.",
                error=f"Erreur inattendue : {exc}",
                error_kind="technique",
            )
        return AgentResponse(
            command=request.command,
            message=f"{len(voyages)} voyage(s) SNCF récupéré(s).",
            voyages=voyages,
        )

    if request.command == "generer":
        assert request.voyages is not None
        if not all(valider_voyage(v) for v in request.voyages):
            return AgentResponse(
                command=request.command,
                message="Génération du calendrier interrompue.",
                error="Données de voyage invalides (champ requis manquant).",
                error_kind="validation",
            )
        contenu = construire_ics(request.voyages)
        return AgentResponse(
            command=request.command,
            message=f"Calendrier .ics généré pour {len(request.voyages)} voyage(s).",
            ics_contenu=contenu,
        )

    raise ValueError(f"Commande inconnue : {request.command!r}")
