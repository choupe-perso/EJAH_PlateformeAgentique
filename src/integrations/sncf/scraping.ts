// Connexion automatique a SNCF Connect (session Playwright persistante,
// Chrome installe sur la machine via channel:"chrome") et recuperation de la
// liste des voyages a venir. Porte depuis l'ancienne plateforme Flask
// (agents/generateur_ics_sncf/scraping.py) - meme logique de scraping.

import { chromium, type BrowserContext, type Page } from "playwright";
import { join } from "path";
import { obtenirIdentifiants } from "./credentials";

const HOME_URL = "https://www.sncf-connect.com";
const TARGET_URL = "https://www.tgvinoui.sncf/informations/voyages-futurs";
// Chemin sans accent : Chromium/Chrome echoue au lancement (spawn UNKNOWN)
// si user-data-dir contient des caracteres non-ASCII sous Windows.
const PROFILE_DIR = join(process.env.LOCALAPPDATA || process.env.HOME || ".", "EJAH", "pw_profile_sncf");

const LOGIN_TIMEOUT_MS = 300_000;

const MOIS_FR: Record<string, number> = {
  janvier: 1,
  février: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  août: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  décembre: 12,
};

export type Voyage = {
  id: string;
  dossier: string;
  annee: number;
  mois: number;
  jour: number;
  heureDepart: [number, number];
  heureArrivee: [number, number];
  gareDepart: string;
  gareArrivee: string;
  trainNumero: string;
  duree: string;
};

async function estPageCible(page: Page): Promise<boolean> {
  if (!page.url().includes("voyages-futurs")) return false;
  try {
    return (await page.locator(".future-trip__item--desktop").count()) > 0;
  } catch {
    return false;
  }
}

async function trouverPageCible(context: BrowserContext): Promise<Page | null> {
  // Le flux de connexion SNCF peut ouvrir la page des voyages dans un nouvel
  // onglet (popup) : on scanne tous les onglets, pas seulement le premier.
  for (const p of context.pages()) {
    try {
      if (await estPageCible(p)) return p;
    } catch {
      continue;
    }
  }
  return null;
}

async function tenterAutoremplissage(page: Page, email: string, motDePasse: string): Promise<void> {
  await page.goto(HOME_URL);
  await page.getByRole("button", { name: "Se connecter" }).first().click();
  await page.waitForTimeout(1500);

  const champEmail = page.locator("input[type='email'], input[name*='email' i], input#email").first();
  await champEmail.waitFor({ state: "visible", timeout: 10_000 });
  await champEmail.fill(email);

  const boutonContinuer = page.getByRole("button", { name: /continuer|suivant|valider/i }).first();
  if (await boutonContinuer.count()) {
    await boutonContinuer.click();
    await page.waitForTimeout(1500);
  }

  const champMdp = page.locator("input[type='password']").first();
  await champMdp.waitFor({ state: "visible", timeout: 10_000 });
  await champMdp.fill(motDePasse);

  const boutonConnexion = page.getByRole("button", { name: /connexion|connecter|valider/i }).first();
  if (await boutonConnexion.count()) {
    await boutonConnexion.click();
  }
}

async function assurerAuthentification(context: BrowserContext, page: Page): Promise<Page> {
  await page.goto(TARGET_URL);
  await page.waitForLoadState("networkidle");
  let trouvee = await trouverPageCible(context);
  if (trouvee) return trouvee;

  const identifiants = obtenirIdentifiants();
  if (identifiants) {
    try {
      await tenterAutoremplissage(page, identifiants.email, identifiants.motDePasse);
    } catch {
      // L'auto-remplissage a echoue : l'utilisateur termine la connexion
      // manuellement dans la fenetre ouverte.
    }
  }

  const deadline = Date.now() + LOGIN_TIMEOUT_MS;
  let dernierEssaiNav = 0;
  while (Date.now() < deadline) {
    trouvee = await trouverPageCible(context);
    if (trouvee) return trouvee;

    let surDomaineAuth: boolean;
    try {
      surDomaineAuth = page.url().includes("auth.") || page.url().includes("monidentifiant.sncf");
    } catch {
      surDomaineAuth = true;
    }

    if (!surDomaineAuth && Date.now() - dernierEssaiNav > 5000) {
      dernierEssaiNav = Date.now();
      try {
        await page.goto(TARGET_URL);
        await page.waitForLoadState("networkidle");
      } catch {
        // ignore, on reessaiera au prochain tour
      }
    }

    await page.waitForTimeout(2000);
  }

  try {
    await page.goto(TARGET_URL);
    await page.waitForLoadState("networkidle");
  } catch {
    // ignore
  }
  trouvee = await trouverPageCible(context);
  if (trouvee) return trouvee;

  throw new Error("Connexion non terminee dans le delai imparti (5 minutes).");
}

async function afficherTout(page: Page): Promise<void> {
  for (;;) {
    const bouton = page.getByRole("button", { name: "Afficher plus" });
    try {
      if ((await bouton.count()) === 0 || !(await bouton.first().isVisible())) break;
      await bouton.first().click();
      await page.waitForTimeout(600);
    } catch {
      break;
    }
  }
}

function anneePour(mois: number, jour: number): number {
  const aujourdhui = new Date();
  const candidate = new Date(aujourdhui.getFullYear(), mois - 1, jour);
  if (candidate < new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate())) {
    return aujourdhui.getFullYear() + 1;
  }
  return aujourdhui.getFullYear();
}

async function scraperVoyages(page: Page): Promise<Voyage[]> {
  const voyages: Voyage[] = [];
  const cartes = page.locator(".future-trip__item--desktop");
  const total = await cartes.count();

  for (let i = 0; i < total; i++) {
    const carte = cartes.nth(i);

    const dateStr = (await carte.locator(".future-trip__item__date").innerText()).trim();
    const dossier = (await carte.locator(".future-trip__item__folder__number").innerText()).trim();

    const heureDepart = (
      await carte.locator(".future-trip__segment__departure__hour span[aria-hidden='true']").innerText()
    ).trim();
    const heureArrivee = (
      await carte.locator(".future-trip__segment__arrival__hour span[aria-hidden='true']").innerText()
    ).trim();

    const gares = await carte.locator(".future-trip__segment__station__list li").allInnerTexts();
    const gareDepart = gares[0].trim();
    const gareArrivee = gares[gares.length - 1].trim();

    const trainNumero = (await carte.locator(".segment__train-number").innerText()).trim();
    const dureeBrute = (await carte.locator(".segment__duration").innerText()).trim();
    const dureeMatch = dureeBrute.match(/(\d+)H(\d+)/i);
    const duree = dureeMatch ? `${dureeMatch[1]}H${dureeMatch[2]}` : dureeBrute;

    const [jourNumStr, moisNomBrut] = dateStr.split(/ (.+)/);
    const moisNum = MOIS_FR[moisNomBrut.trim().toLowerCase()];
    const jourNum = parseInt(jourNumStr, 10);
    const annee = anneePour(moisNum, jourNum);

    const hdMatch = heureDepart.match(/(\d+)h(\d+)/i)!;
    const haMatch = heureArrivee.match(/(\d+)h(\d+)/i)!;

    const trainNumMatch = trainNumero.match(/N°(\d+)/);
    const trainNumCourt = trainNumMatch ? trainNumMatch[1] : trainNumero;

    const voyageId = `${dossier}_${annee.toString().padStart(4, "0")}${moisNum.toString().padStart(2, "0")}${jourNum
      .toString()
      .padStart(2, "0")}_${trainNumCourt}`;

    voyages.push({
      id: voyageId,
      dossier,
      annee,
      mois: moisNum,
      jour: jourNum,
      heureDepart: [parseInt(hdMatch[1], 10), parseInt(hdMatch[2], 10)],
      heureArrivee: [parseInt(haMatch[1], 10), parseInt(haMatch[2], 10)],
      gareDepart,
      gareArrivee,
      trainNumero,
      duree,
    });
  }

  return voyages;
}

export async function recupererVoyages(headless = false): Promise<Voyage[]> {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    viewport: { width: 1400, height: 900 },
    channel: "chrome",
    args: ["--disable-blink-features=AutomationControlled"],
    ignoreDefaultArgs: ["--enable-automation"],
  });

  try {
    await context.addInitScript(
      "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
    );
    const page = context.pages()[0] ?? (await context.newPage());
    const pageCible = await assurerAuthentification(context, page);
    await afficherTout(pageCible);
    return await scraperVoyages(pageCible);
  } finally {
    await context.close();
  }
}
