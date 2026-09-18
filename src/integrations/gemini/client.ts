// Adaptateur Gemini pour la Veille - implemente MoteurDialogue/MoteurAnalyse
// via l'API Google Generative Language, palier gratuit uniquement (EXG-001 :
// aucun service payant, ni comme option, ni comme secours). Un quota
// depasse ou une erreur reseau remonte "indisponible" - jamais de bascule
// automatique vers un autre moteur (EXG-004), voir core/veille/moteurs.ts.

import type { MoteurAnalyse, MoteurDialogue, MoteurResultat, TourDialogue } from "@/shared/veille/moteur";

// gemini-2.0-flash, puis gemini-2.5-flash-lite, se sont reveles retires
// coup sur coup (Google fait evoluer son catalogue tres vite - constate le
// 2026-09-16, a quelques heures d'intervalle, via l'appel reel qui a
// renvoye "This model ... is no longer available to new users. Please
// update your code to use models/gemini-3.5-flash-lite"). gemini-3.5-flash-lite
// est le remplacement direct recommande par Google lui-meme, confirme par
// un appel reel (HTTP 200) - toujours au palier gratuit (EXG-001 : jamais
// de palier payant). Si ce modele est a son tour retire, l'erreur HTTP 404
// remontee par Google nomme explicitement son remplacant : verifier avec un
// appel direct avant de changer cette valeur, la page de pricing seule
// s'est deja reveled en retard sur le catalogue reel.
const MODELE_PAR_DEFAUT = "gemini-3.5-flash-lite";
const DELAI_MAX_MS = 60_000;

function configuration(): { cle: string | null; modele: string } {
  return {
    cle: process.env.GEMINI_API_KEY || null,
    modele: process.env.GEMINI_MODEL || MODELE_PAR_DEFAUT,
  };
}

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

async function appelGemini(prompt: string): Promise<{ ok: true; texte: string } | { ok: false; raison: string }> {
  const cfg = configuration();
  if (!cfg.cle) {
    return { ok: false, raison: "GEMINI_API_KEY absente - clé gratuite non configurée dans .env.local." };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DELAI_MAX_MS);

  let reponse: Response;
  try {
    reponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${cfg.modele}:generateContent?key=${cfg.cle}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal,
      }
    );
  } catch (erreur) {
    if (erreur instanceof Error && erreur.name === "AbortError") {
      return { ok: false, raison: `Gemini n'a pas répondu en ${DELAI_MAX_MS / 1000}s.` };
    }
    return { ok: false, raison: "Gemini injoignable (réseau)." };
  } finally {
    clearTimeout(timeoutId);
  }

  if (reponse.status === 429) {
    return { ok: false, raison: "Quota gratuit Gemini atteint - moteur temporairement indisponible." };
  }
  if (!reponse.ok) {
    // Google renomme/retire ses modeles frequemment (constate deux fois en
    // une session) - son message d'erreur nomme explicitement le modele de
    // remplacement recommande quand c'est le cas, bien plus utile que le
    // seul code HTTP pour diagnostiquer sans repasser par un appel manuel.
    const corpsErreur = await reponse.text().catch(() => "");
    let messageDetaille = "";
    try {
      const json = JSON.parse(corpsErreur) as { error?: { message?: string } };
      messageDetaille = json.error?.message ?? "";
    } catch {
      messageDetaille = corpsErreur.slice(0, 300);
    }
    return {
      ok: false,
      raison: `Gemini a répondu une erreur (HTTP ${reponse.status})${messageDetaille ? ` - ${messageDetaille}` : ""}.`,
    };
  }

  const corps = (await reponse.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const texte = corps.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!texte.trim()) {
    return { ok: false, raison: "Gemini a répondu sans contenu exploitable." };
  }
  return { ok: true, texte: texte.trim() };
}

async function appelSecurise<T>(prompt: string, mapper: (texte: string) => T): Promise<MoteurResultat<T>> {
  const resultat = await appelGemini(prompt);
  if (!resultat.ok) return { status: "indisponible", raison: resultat.raison };
  return { status: "ok", valeur: mapper(resultat.texte) };
}

export const geminiDialogue: MoteurDialogue = {
  id: "gemini",
  converser({ contexte, historique, messageUtilisateur }) {
    const prompt = `${contexte}\n\n${formaterHistorique(historique)}\nUtilisateur: ${messageUtilisateur}\nAssistant:`;
    return appelSecurise(prompt, (texte) => ({ reponse: texte }));
  },
};

export const geminiAnalyse: MoteurAnalyse = {
  id: "gemini",
  extraireObservations({ contexte, contenu }) {
    const prompt = `${contexte}\n\nContenu à analyser :\n${contenu}\n\nRéponds uniquement avec un tableau JSON d'observations.`;
    return appelSecurise(prompt, (texte) => ({ observations: extraireJson<Array<Record<string, unknown>>>(texte) ?? [] }));
  },
  comparerObservation({ contexte, evenementConnu, observation }) {
    const prompt =
      `${contexte}\n\nEvenement connu :\n${JSON.stringify(evenementConnu)}\n\n` +
      `Nouvelle observation :\n${JSON.stringify(observation)}\n\n` +
      `Réponds uniquement avec un objet JSON {"identique": bool, "modifie": bool}.`;
    return appelSecurise(
      prompt,
      (texte) => extraireJson<{ identique: boolean; modifie: boolean }>(texte) ?? { identique: false, modifie: false }
    );
  },
};
