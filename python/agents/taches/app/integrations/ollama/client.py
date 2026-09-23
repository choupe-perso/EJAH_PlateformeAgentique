# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Rédaction assistée (email / prompt) via un serveur Ollama local.

Migré depuis l'ancienne plateforme Flask
(agents/todos_transport/ollama_client.py). Injoignable ou mal configuré ne
doit jamais lever d'exception non contrôlée - voir OllamaError, remontée
proprement par app.service.

Stdlib uniquement (urllib) : ce cœur n'ajoute aucune dépendance au venv
partagé de la gateway (voir python/gateway/requirements.txt)."""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request

HOTE_PAR_DEFAUT = "http://localhost:11434"
MODELE_PAR_DEFAUT = "qwen3:8b"
# 600s : même marge empirique que l'agent voyages/l'ancienne plateforme
# Flask sur ce matériel (CPU, pas de GPU) - un prompt riche suivi d'une
# génération à ~8 tokens/s peut légitimement approcher plusieurs minutes.
DELAI_MAX_SECONDES = 600


class OllamaError(Exception):
    pass


def _configuration() -> tuple[str, str]:
    hote = os.environ.get("OLLAMA_HOST") or HOTE_PAR_DEFAUT
    modele = os.environ.get("OLLAMA_MODEL") or MODELE_PAR_DEFAUT
    return hote, modele


def appel_ollama(prompt: str) -> str:
    hote, modele = _configuration()
    corps = json.dumps(
        {
            # think:false - qwen3 est un modèle "hybride raisonnement" qui,
            # par défaut, génère un bloc <think> verbeux avant chaque
            # réponse (même pour une tâche triviale) : désactivé ici car la
            # rédaction n'en a pas besoin (latence x10-40 observée sinon).
            "model": modele,
            "prompt": prompt,
            "stream": False,
            "think": False,
        }
    ).encode("utf-8")

    requete = urllib.request.Request(
        f"{hote}/api/generate",
        data=corps,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(requete, timeout=DELAI_MAX_SECONDES) as reponse:
            statut = reponse.status
            brut = reponse.read()
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise OllamaError(
                f"Modèle « {modele} » introuvable sur Ollama ({hote}). "
                f"Vérifie qu'il est bien téléchargé (`ollama pull {modele}`)."
            ) from exc
        raise OllamaError(f"Ollama a répondu une erreur (HTTP {exc.code}).") from exc
    except TimeoutError as exc:
        raise OllamaError(
            f"Ollama ({hote}) n'a pas répondu en {DELAI_MAX_SECONDES}s. "
            f"Le modèle « {modele} » est peut-être en cours de chargement en mémoire "
            f"(premier appel après démarrage) : réessaie dans quelques instants."
        ) from exc
    except urllib.error.URLError as exc:
        raise OllamaError(f"Ollama injoignable sur {hote}. Vérifie qu'il est lancé, puis réessaie.") from exc

    if statut != 200:
        raise OllamaError(f"Ollama a répondu une erreur (HTTP {statut}).")

    try:
        donnees = json.loads(brut.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise OllamaError("Réponse d'Ollama illisible (pas du JSON).") from exc

    texte = (donnees.get("response") or "").strip()
    if not texte:
        raise OllamaError("Ollama a répondu sans contenu exploitable.")
    return texte


_MOTIF_COMPLET = re.compile(r"TITRE\s*:\s*(.+?)\n+TEXTE\s*:\s*\n?([\s\S]*)", re.IGNORECASE)
_MOTIF_TITRE_SEUL = re.compile(r"^TITRE\s*:\s*(.+)", re.IGNORECASE)


def extraire_titre_texte(reponse_brute: str) -> tuple[str, str]:
    complet = _MOTIF_COMPLET.match(reponse_brute)
    if complet:
        return complet.group(1).strip(), complet.group(2).strip()

    reponse = reponse_brute.strip()
    seulement_titre = _MOTIF_TITRE_SEUL.match(reponse)
    if seulement_titre:
        titre = seulement_titre.group(1).strip()
        texte = reponse[seulement_titre.end():].strip()
        return titre, texte

    return "", reponse
