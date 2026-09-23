# Créé par Cédric HOUPE.
# Usage ou reproduction à l'identique interdit sans autorisation.
"""Connexion automatique à SNCF Connect (session Playwright persistante +
identifiants Windows Credential Manager) et récupération de la liste des
voyages à venir.

Migré depuis l'ancienne plateforme Flask
(agents/generateur_ics_sncf/scraping.py) vers l'agent EJAH "voyages" -
même logique de scraping ; le calcul d'année déjà purement métier est
désormais dans app.domain.entities.annee_pour."""
from __future__ import annotations

import os
import re
import time
from pathlib import Path
from typing import Callable

from playwright.sync_api import BrowserContext, Page, sync_playwright

from app.domain.entities import annee_pour
from app.integrations.sncf.credentials import obtenir_identifiants

HOME_URL = "https://www.sncf-connect.com"
TARGET_URL = "https://www.tgvinoui.sncf/informations/voyages-futurs"
# Chemin sans accent : Playwright/Chromium échoue au lancement (spawn UNKNOWN)
# si user-data-dir contient des caractères non-ASCII sous Windows.
PROFILE_DIR = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "EJAH" / "pw_profile_voyages"

LOGIN_TIMEOUT_SECONDS = 300

MOIS_FR = {
    "janvier": 1, "février": 2, "mars": 3, "avril": 4, "mai": 5, "juin": 6,
    "juillet": 7, "août": 8, "septembre": 9, "octobre": 10, "novembre": 11,
    "décembre": 12,
}


def _est_page_cible(page: Page) -> bool:
    if "voyages-futurs" not in page.url:
        return False
    try:
        return page.locator(".future-trip__item--desktop").count() > 0
    except Exception:
        return False


def _trouver_page_cible(context: BrowserContext) -> Page | None:
    """Le flux de connexion SNCF peut ouvrir la page des voyages dans un
    nouvel onglet (popup) : on scanne tous les onglets, pas seulement le premier."""
    for p in context.pages:
        try:
            if _est_page_cible(p):
                return p
        except Exception:
            continue
    return None


def _tenter_autoremplissage(page: Page, email: str, mot_de_passe: str) -> None:
    page.goto(HOME_URL)
    page.get_by_role("button", name="Se connecter").first.click()
    page.wait_for_timeout(1500)

    champ_email = page.locator(
        "input[type='email'], input[name*='email' i], input#email"
    ).first
    champ_email.wait_for(state="visible", timeout=10000)
    champ_email.fill(email)

    bouton_continuer = page.get_by_role("button", name=re.compile("continuer|suivant|valider", re.I)).first
    if bouton_continuer.count():
        bouton_continuer.click()
        page.wait_for_timeout(1500)

    champ_mdp = page.locator("input[type='password']").first
    champ_mdp.wait_for(state="visible", timeout=10000)
    champ_mdp.fill(mot_de_passe)

    bouton_connexion = page.get_by_role("button", name=re.compile("connexion|connecter|valider", re.I)).first
    if bouton_connexion.count():
        bouton_connexion.click()


def _assurer_authentification(context: BrowserContext, page: Page) -> Page:
    page.goto(TARGET_URL)
    page.wait_for_load_state("networkidle")
    trouvee = _trouver_page_cible(context)
    if trouvee:
        return trouvee

    email, mot_de_passe = obtenir_identifiants()
    if email and mot_de_passe:
        try:
            _tenter_autoremplissage(page, email, mot_de_passe)
        except Exception:
            # L'auto-remplissage a echoue : l'utilisateur termine la
            # connexion manuellement dans la fenetre ouverte.
            pass

    deadline = time.time() + LOGIN_TIMEOUT_SECONDS
    dernier_essai_nav = 0.0
    while time.time() < deadline:
        trouvee = _trouver_page_cible(context)
        if trouvee:
            return trouvee

        try:
            sur_domaine_auth = "auth." in page.url or "monidentifiant.sncf" in page.url
        except Exception:
            sur_domaine_auth = True

        if not sur_domaine_auth and time.time() - dernier_essai_nav > 5:
            dernier_essai_nav = time.time()
            try:
                page.goto(TARGET_URL)
                page.wait_for_load_state("networkidle")
            except Exception:
                pass

        time.sleep(2)

    try:
        page.goto(TARGET_URL)
        page.wait_for_load_state("networkidle")
    except Exception:
        pass
    trouvee = _trouver_page_cible(context)
    if trouvee:
        return trouvee

    raise TimeoutError("Connexion non terminée dans le délai imparti (5 minutes).")


def _afficher_tout(page: Page) -> None:
    while True:
        bouton = page.get_by_role("button", name="Afficher plus")
        try:
            if bouton.count() == 0 or not bouton.first.is_visible():
                break
            bouton.first.click()
            page.wait_for_timeout(600)
        except Exception:
            break


def _scraper_voyages(page: Page) -> list[dict]:
    voyages = []
    cartes = page.locator(".future-trip__item--desktop")
    for i in range(cartes.count()):
        carte = cartes.nth(i)

        date_str = carte.locator(".future-trip__item__date").inner_text().strip()
        dossier = carte.locator(".future-trip__item__folder__number").inner_text().strip()

        heure_depart = carte.locator(
            ".future-trip__segment__departure__hour span[aria-hidden='true']"
        ).inner_text().strip()
        heure_arrivee = carte.locator(
            ".future-trip__segment__arrival__hour span[aria-hidden='true']"
        ).inner_text().strip()

        gares = carte.locator(".future-trip__segment__station__list li").all_inner_texts()
        gare_depart = gares[0].strip()
        gare_arrivee = gares[-1].strip()

        train_numero = carte.locator(".segment__train-number").inner_text().strip()
        duree_brute = carte.locator(".segment__duration").inner_text().strip()
        m = re.search(r"(\d+)H(\d+)", duree_brute, re.I)
        duree = f"{m.group(1)}H{m.group(2)}" if m else duree_brute

        jour_num, mois_nom = date_str.split(" ", 1)
        mois_num = MOIS_FR[mois_nom.strip().lower()]
        annee = annee_pour(mois_num, int(jour_num))

        hd_h, hd_m = map(int, re.match(r"(\d+)h(\d+)", heure_depart).groups())
        ha_h, ha_m = map(int, re.match(r"(\d+)h(\d+)", heure_arrivee).groups())

        train_num_court = re.search(r"N°(\d+)", train_numero)
        train_num_court = train_num_court.group(1) if train_num_court else train_numero

        voyage_id = f"{dossier}_{annee:04d}{mois_num:02d}{int(jour_num):02d}_{train_num_court}"

        voyages.append({
            "id": voyage_id,
            "dossier": dossier,
            "annee": annee,
            "mois": mois_num,
            "jour": int(jour_num),
            "heure_depart": [hd_h, hd_m],
            "heure_arrivee": [ha_h, ha_m],
            "gare_depart": gare_depart,
            "gare_arrivee": gare_arrivee,
            "train_numero": train_numero,
            "duree": duree,
        })

    return voyages


def recuperer_voyages(
    headless: bool = False,
    on_progress: Callable[[str], None] | None = None,
) -> list[dict]:
    """Ouvre une session Chrome (persistante), s'assure que l'utilisateur est
    connecté à SNCF Connect (auto-remplissage si des identifiants sont enregistrés,
    sinon connexion manuelle dans la fenêtre ouverte) puis scrape les voyages à venir.

    Args:
        headless: Si True, lance Chrome sans fenêtre visible (impossible de
            terminer une connexion manuelle/2FA dans ce mode).
        on_progress: Optionnel - appelé avec "authentification" avant
            d'attendre la page cible (peut durer jusqu'à 5 minutes si une
            connexion manuelle est nécessaire), puis avec "scraping" une
            fois la page trouvée et l'extraction commencée. Permet à un
            appelant (ex. adaptateur web) de refléter une progression sans
            que ce module connaisse le canal utilisé pour l'afficher.

    Returns:
        Liste de voyages (dictionnaires : id, dossier, annee, mois, jour,
        heure_depart, heure_arrivee, gare_depart, gare_arrivee, train_numero, duree).

    Raises:
        TimeoutError: Si la connexion n'est pas terminée dans les 5 minutes.
    """
    def _signal(etat: str) -> None:
        if on_progress is not None:
            on_progress(etat)

    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            str(PROFILE_DIR), headless=headless, viewport={"width": 1400, "height": 900},
            channel="chrome",
            args=["--disable-blink-features=AutomationControlled"],
            ignore_default_args=["--enable-automation"],
        )
        try:
            context.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
            )
            page = context.pages[0] if context.pages else context.new_page()
            _signal("authentification")
            page = _assurer_authentification(context, page)
            _signal("scraping")
            _afficher_tout(page)
            return _scraper_voyages(page)
        finally:
            context.close()
