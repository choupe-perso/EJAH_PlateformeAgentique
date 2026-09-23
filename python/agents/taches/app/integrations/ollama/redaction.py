# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Rédaction assistée (email / prompt) pour l'agent Tâches, via Ollama local.

Migré depuis l'ancienne plateforme Flask
(agents/todos_transport/ollama_client.py). Les règles rédactionnelles
(rôle, règles, style personnel, paramètres) sont externalisées en fichiers
texte sous prompts/ plutôt que codées en dur ici : modifier le ton, le
style ou les règles se fait en éditant ces fichiers .txt, sans toucher au
code."""
from __future__ import annotations

from pathlib import Path

from app.integrations.ollama.client import appel_ollama, extraire_titre_texte

PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"

FORMAT_EMAIL = (
    "Reponds STRICTEMENT sous cette forme, sans rien ajouter avant ou apres :\n"
    "TITRE: <objet de l'email>\n"
    "TEXTE:\n<corps de l'email>"
)
FORMAT_PROMPT = "Reponds uniquement avec le texte final, sans aucun commentaire avant ou apres."


def _charger_fragment(chemin_relatif: str) -> str:
    try:
        return (PROMPTS_DIR / chemin_relatif).read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def _section(titre: str, contenu: str) -> str:
    return f"[{titre}]\n{contenu}" if contenu else ""


def _assembler(*sections: str) -> str:
    return "\n\n".join(s for s in sections if s)


def _preambule_mail(registre: str, ton: str, longueur: str) -> str:
    parametres = _assembler(
        _charger_fragment(f"mail/relation/{registre}.txt"),
        _charger_fragment(f"mail/ton/{ton}.txt"),
        _charger_fragment(f"mail/longueur/{longueur}.txt"),
    )
    return _assembler(
        _section("ROLE", _charger_fragment("mail/role.txt")),
        _section("REGLES", _charger_fragment("mail/regles.txt")),
        _section("STYLE PERSONNEL", _charger_fragment("commun/style.txt")),
        _section("PARAMETRES", parametres),
    )


def _preambule_prompt(niveau: str) -> str:
    return _assembler(
        _section("ROLE", _charger_fragment("prompt/role.txt")),
        _section("REGLES", _charger_fragment("prompt/regles.txt")),
        _section("STYLE PERSONNEL", _charger_fragment("commun/style.txt")),
        _section("PARAMETRES", _charger_fragment(f"prompt/niveau/{niveau}.txt")),
    )


def rediger_email(destinataire: str, notes: str, registre: str, ton: str, longueur: str) -> tuple[str, str]:
    """Retourne (titre, texte) d'un brouillon d'email généré depuis des notes libres."""
    demande = _section(
        "DEMANDE UTILISATEUR",
        f"<<<\nDestinataire : {destinataire}\n"
        f"Notes de l'expediteur (ce qu'il veut dire, a transformer en message) : {notes}\n>>>",
    )
    prompt = _assembler(_preambule_mail(registre, ton, longueur), demande, FORMAT_EMAIL)
    return extraire_titre_texte(appel_ollama(prompt))


def reecrire_email(
    destinataire: str,
    titre_actuel: str,
    texte_actuel: str,
    precisions: str,
    registre: str,
    ton: str,
    longueur: str,
) -> tuple[str, str]:
    """Retourne (titre, texte) d'un brouillon d'email réécrit à partir de précisions."""
    demande = _section(
        "DEMANDE UTILISATEUR",
        f"<<<\nDestinataire : {destinataire}\n"
        f"Brouillon actuel — titre : {titre_actuel}\n"
        f"Brouillon actuel — texte :\n{texte_actuel}\n\n"
        f"Precisions pour la reecriture : {precisions}\n>>>",
    )
    prompt = _assembler(_preambule_mail(registre, ton, longueur), demande, FORMAT_EMAIL)
    return extraire_titre_texte(appel_ollama(prompt))


def rediger_prompt(ia: str, projet: str, titre: str, notes: str, niveau: str) -> str:
    """Retourne le texte d'un brouillon de prompt généré depuis des notes libres."""
    demande = _section(
        "DEMANDE UTILISATEUR",
        f"<<<\nIA cible : {ia}\nProjet : {projet}\nTitre : {titre}\n"
        f"Notes de l'utilisateur (ce qu'il veut dire, a transformer en prompt) : {notes}\n>>>",
    )
    prompt = _assembler(_preambule_prompt(niveau), demande, FORMAT_PROMPT)
    return appel_ollama(prompt).strip()


def reecrire_prompt(ia: str, projet: str, titre: str, texte_actuel: str, precisions: str, niveau: str) -> str:
    """Retourne le texte d'un prompt réécrit à partir de précisions."""
    demande = _section(
        "DEMANDE UTILISATEUR",
        f"<<<\nIA cible : {ia}\nProjet : {projet}\nTitre : {titre}\n"
        f"Prompt actuel :\n{texte_actuel}\n\n"
        f"Precisions pour la reecriture : {precisions}\n>>>",
    )
    prompt = _assembler(_preambule_prompt(niveau), demande, FORMAT_PROMPT)
    return appel_ollama(prompt).strip()
