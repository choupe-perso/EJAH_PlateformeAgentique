// Session Playwright pour ChatGPT Web (agent Veille) - contexte persistant
// local, MEME PRINCIPE que src/integrations/sncf/scraping.ts (profil sous
// %LOCALAPPDATA%\EJAH), mais SANS aucun auto-remplissage d'identifiant :
// EXG-005 interdit toute saisie/stockage d'identifiant par l'automatisation
// pour cette fonctionnalite. La connexion est TOUJOURS faite manuellement
// par l'utilisateur, dans une fenetre de navigateur ouverte a cet effet
// (voir ouvrirPourConnexionManuelle). Le contexte automatise (headless) se
// contente de DETECTER si une session valide existe deja ; si non, il
// remonte immediatement "indisponible" sans attendre ni rien saisir.

import { chromium, type BrowserContext } from "playwright";
import { join } from "path";

const CHATGPT_URL = "https://chatgpt.com";
const PROFILE_DIR = join(process.env.LOCALAPPDATA || process.env.HOME || ".", "EJAH", "pw_profile_chatgpt");

// Selecteurs de l'interface ChatGPT Web - susceptibles de changer si OpenAI
// modifie son DOM ; a ajuster si la detection/l'extraction se met a echouer.
const SELECTEUR_COMPOSITEUR = "#prompt-textarea";
const SELECTEUR_BOUTON_ENVOYER = "[data-testid='send-button']";
const SELECTEUR_BOUTON_STOP = "[data-testid='stop-button']";
const SELECTEUR_MESSAGES_ASSISTANT = "[data-message-author-role='assistant']";

export async function ouvrirContexte(headless: boolean): Promise<BrowserContext> {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    viewport: { width: 1280, height: 900 },
    channel: "chrome",
    args: ["--disable-blink-features=AutomationControlled"],
    ignoreDefaultArgs: ["--enable-automation"],
  });
  await context.addInitScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});");
  return context;
}

export async function estAuthentifie(context: BrowserContext): Promise<boolean> {
  const page = context.pages()[0] ?? (await context.newPage());
  try {
    await page.goto(CHATGPT_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(1500);
    return (await page.locator(SELECTEUR_COMPOSITEUR).count()) > 0;
  } catch {
    return false;
  }
}

// Ouvre une fenetre VISIBLE sur chatgpt.com pour que l'utilisateur s'y
// connecte lui-meme. N'automatise rien du formulaire de connexion. Appele
// uniquement depuis une action explicite de l'utilisateur (bouton "Se
// connecter"), jamais depuis l'execution automatique de la veille.
export async function ouvrirPourConnexionManuelle(): Promise<void> {
  const context = await ouvrirContexte(false);
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(CHATGPT_URL);
  // Le contexte persistant reste ouvert : la fenetre reste a l'ecran pour
  // que l'utilisateur termine sa connexion a son rythme. Le profil est
  // sauvegarde automatiquement (launchPersistentContext), reutilise par
  // les appels headless suivants une fois la connexion etablie.
}

export const selecteurs = {
  compositeur: SELECTEUR_COMPOSITEUR,
  boutonEnvoyer: SELECTEUR_BOUTON_ENVOYER,
  boutonStop: SELECTEUR_BOUTON_STOP,
  messagesAssistant: SELECTEUR_MESSAGES_ASSISTANT,
};

export { CHATGPT_URL };
