// Adaptateur Veille pour ChatGPT Web - implemente MoteurDialogue/
// MoteurAnalyse en pilotant une session Playwright deja authentifiee
// manuellement (voir ./session.ts). Si la session n'est pas authentifiee,
// remonte "indisponible" immediatement (aucune attente, aucune saisie
// d'identifiant - EXG-005).

import type { BrowserContext } from "playwright";
import { ouvrirContexte, estAuthentifie, selecteurs, CHATGPT_URL } from "./session";
import type { MoteurAnalyse, MoteurDialogue, MoteurResultat, TourDialogue } from "@/shared/veille/moteur";

const RAISON_NON_AUTHENTIFIE =
  "Session ChatGPT non authentifiée - connexion manuelle requise (bouton « Se connecter à ChatGPT »).";
const DELAI_REPONSE_MS = 120_000;

function formaterHistorique(historique: TourDialogue[]): string {
  return historique.map((t) => `${t.role === "utilisateur" ? "Utilisateur" : "Assistant"}: ${t.contenu}`).join("\n");
}

function extraireJson<T>(texte: string): T | null {
  const debut = texte.indexOf("{");
  const brackDebut = texte.indexOf("[");
  const indexDebut = debut === -1 ? brackDebut : brackDebut === -1 ? debut : Math.min(debut, brackDebut);
  if (indexDebut === -1) return null;
  const fin = Math.max(texte.lastIndexOf("}"), texte.lastIndexOf("]"));
  if (fin === -1 || fin < indexDebut) return null;
  try {
    return JSON.parse(texte.slice(indexDebut, fin + 1)) as T;
  } catch {
    return null;
  }
}

async function envoyerMessage(context: BrowserContext, message: string): Promise<string> {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(CHATGPT_URL, { waitUntil: "domcontentloaded" });

  const compositeur = page.locator(selecteurs.compositeur);
  await compositeur.waitFor({ state: "visible", timeout: 15_000 });
  await compositeur.click();
  await compositeur.fill(message);

  const boutonEnvoyer = page.locator(selecteurs.boutonEnvoyer);
  await boutonEnvoyer.click();

  // Attend la fin de generation (disparition du bouton "stop"), avec un
  // delai max - une reponse tres longue peut legitimement depasser
  // DELAI_REPONSE_MS, auquel cas on remonte le dernier contenu disponible.
  const boutonStop = page.locator(selecteurs.boutonStop);
  try {
    await boutonStop.waitFor({ state: "visible", timeout: 10_000 });
    await boutonStop.waitFor({ state: "hidden", timeout: DELAI_REPONSE_MS });
  } catch {
    // Pas de bouton stop detecte (reponse tres rapide) ou delai depasse :
    // on tente quand meme de lire la derniere reponse disponible.
  }

  const messages = page.locator(selecteurs.messagesAssistant);
  const nbMessages = await messages.count();
  if (nbMessages === 0) {
    throw new Error("Aucune réponse ChatGPT détectée.");
  }
  return (await messages.nth(nbMessages - 1).innerText()).trim();
}

async function appelSecurise<T>(
  construireMessage: () => string,
  mapper: (texte: string) => T
): Promise<MoteurResultat<T>> {
  const context = await ouvrirContexte(true);
  try {
    if (!(await estAuthentifie(context))) {
      return { status: "indisponible", raison: RAISON_NON_AUTHENTIFIE };
    }
    const reponse = await envoyerMessage(context, construireMessage());
    if (!reponse) {
      return { status: "indisponible", raison: "ChatGPT a répondu sans contenu exploitable." };
    }
    return { status: "ok", valeur: mapper(reponse) };
  } catch (erreur) {
    return {
      status: "indisponible",
      raison: erreur instanceof Error ? `ChatGPT : ${erreur.message}` : "ChatGPT : erreur inattendue.",
    };
  } finally {
    await context.close();
  }
}

export const chatgptDialogue: MoteurDialogue = {
  id: "chatgpt",
  converser({ contexte, historique, messageUtilisateur }) {
    return appelSecurise(
      () => `${contexte}\n\n${formaterHistorique(historique)}\nUtilisateur: ${messageUtilisateur}`,
      (reponse) => ({ reponse })
    );
  },
};

export const chatgptAnalyse: MoteurAnalyse = {
  id: "chatgpt",
  extraireObservations({ contexte, contenu }) {
    return appelSecurise(
      () => `${contexte}\n\nContenu à analyser :\n${contenu}\n\nRéponds uniquement avec un tableau JSON d'observations.`,
      (reponse) => ({ observations: extraireJson<Array<Record<string, unknown>>>(reponse) ?? [] })
    );
  },
  comparerObservation({ contexte, evenementConnu, observation }) {
    return appelSecurise(
      () =>
        `${contexte}\n\nEvenement connu :\n${JSON.stringify(evenementConnu)}\n\n` +
        `Nouvelle observation :\n${JSON.stringify(observation)}\n\n` +
        `Réponds uniquement avec un objet JSON {"identique": bool, "modifie": bool}.`,
      (reponse) => extraireJson<{ identique: boolean; modifie: boolean }>(reponse) ?? { identique: false, modifie: false }
    );
  },
};
