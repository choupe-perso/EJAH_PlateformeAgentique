// Recuperation HTTP simple du contenu d'une source (agent Veille). V1 :
// fetch + nettoyage grossier du HTML, pas de scraping specifique par site
// (Playwright reste reserve au moteur ChatGPT dans cette fonctionnalite -
// une source sans URL exploitable est traitee comme un echec de collecte,
// pas bloquant pour les autres sources du sujet, EXG-093).

const DELAI_MAX_MS = 20_000;
const TAILLE_MAX = 20_000;

export type ResultatCollecte = { ok: true; contenu: string } | { ok: false; erreur: string };

export async function recupererContenuUrl(url: string): Promise<ResultatCollecte> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DELAI_MAX_MS);

  try {
    const reponse = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EJAH-Veille/1.0)" },
    });
    if (!reponse.ok) {
      return { ok: false, erreur: `HTTP ${reponse.status} sur ${url}` };
    }
    const brut = await reponse.text();
    const nettoye = brut
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!nettoye) return { ok: false, erreur: `Contenu vide sur ${url}` };
    return { ok: true, contenu: nettoye.slice(0, TAILLE_MAX) };
  } catch (erreur) {
    if (erreur instanceof Error && erreur.name === "AbortError") {
      return { ok: false, erreur: `Délai dépassé (${DELAI_MAX_MS / 1000}s) sur ${url}` };
    }
    return { ok: false, erreur: `Injoignable : ${url}` };
  } finally {
    clearTimeout(timeoutId);
  }
}
