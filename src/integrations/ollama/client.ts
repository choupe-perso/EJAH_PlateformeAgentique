// Redaction assistee (email / prompt) via un serveur Ollama local.
// Porte depuis l'ancienne plateforme Flask (agents/todos_transport/ollama_client.py).
//
// Injoignable ou mal configure ne doit jamais bloquer le reste de l'agent -
// voir OllamaError, remontee proprement par les cas d'usage (src/core).

// Utilise le fetch ET l'Agent du package undici (et non le fetch global de
// Node) : le fetch global de Node embarque sa PROPRE copie interne
// d'undici, incompatible avec un Agent construit depuis le package npm
// (erreur "invalid onRequestStart method" constatee a l'usage) - il faut
// que fetch et Agent proviennent de la meme instance undici.
import { Agent, fetch } from "undici";

const HOTE_PAR_DEFAUT = "http://localhost:11434";
const MODELE_PAR_DEFAUT = "qwen3:8b";
// Modele "leger" : reserve aux taches mecaniques (ex. interpreter une
// reponse deja redigee en JSON structure) qui n'ont pas besoin de la
// capacite de raisonnement du modele principal - net gain de vitesse sur
// ce materiel (CPU) constate a l'usage pour ce type de tache.
const MODELE_LEGER_PAR_DEFAUT = "qwen3:1.7b";
// 600s : mesure empirique sur ce materiel (CPU, pas de GPU) pendant la
// verification de la Veille - un prompt d'environ 1200 tokens prend deja
// ~52s rien qu'en prefill (pas de generation), et qwen3:8b genere ensuite
// a ~8 tokens/s. Le prompt riche de qualification (~900 mots) suivi d'un
// 2e appel d'interpretation (qui relit toute la reponse du 1er) peut donc
// legitimement approcher plusieurs minutes cumulees - ce n'est pas une
// marge choisie a priori mais la limite reelle observee.
const DELAI_MAX_MS = 600_000;

// Le fetch natif de Node (undici) applique par defaut ses propres delais
// internes (headersTimeout/bodyTimeout ~300s), independants de notre
// AbortController - une reponse Ollama plus longue que 300s se voit donc
// coupee par undici avant meme notre propre DELAI_MAX_MS, avec une erreur
// generique de type "connexion perdue" qui ressemble a tort a un serveur
// injoignable. Un dispatcher dedie, aligne sur DELAI_MAX_MS, evite ca -
// diagnostique via un test direct pendant la verification de la Veille.
const dispatcherLongueDuree = new Agent({
  headersTimeout: DELAI_MAX_MS,
  bodyTimeout: DELAI_MAX_MS,
});

function configuration() {
  return {
    hote: process.env.OLLAMA_HOST || HOTE_PAR_DEFAUT,
    modele: process.env.OLLAMA_MODEL || MODELE_PAR_DEFAUT,
    modeleLeger: process.env.OLLAMA_MODEL_LEGER || MODELE_LEGER_PAR_DEFAUT,
  };
}

export class OllamaError extends Error {}

export async function appelOllama(prompt: string, options?: { leger?: boolean }): Promise<string> {
  const cfg = configuration();
  const modele = options?.leger ? cfg.modeleLeger : cfg.modele;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DELAI_MAX_MS);

  let reponse: Awaited<ReturnType<typeof fetch>>;
  try {
    reponse = await fetch(`${cfg.hote}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // think:false - qwen3 est un modele "hybride raisonnement" qui, par
      // defaut, genere un bloc <think> verbeux avant chaque reponse (meme
      // pour une tache triviale) : desactive ici car nos usages (redaction,
      // extraction JSON) n'en ont pas besoin et cela multiplie la latence
      // par 10-40x sur ce materiel (observe : ~40s vs <1s pour "OK").
      body: JSON.stringify({ model: modele, prompt, stream: false, think: false }),
      signal: controller.signal,
      dispatcher: dispatcherLongueDuree,
    });
  } catch (erreur) {
    if (erreur instanceof Error && erreur.name === "AbortError") {
      throw new OllamaError(
        `Ollama (${cfg.hote}) n'a pas repondu en ${DELAI_MAX_MS / 1000}s. ` +
          `Le modele « ${modele} » est peut-etre en cours de chargement en memoire ` +
          `(premier appel apres demarrage) : reessaie dans quelques instants.`
      );
    }
    throw new OllamaError(`Ollama injoignable sur ${cfg.hote}. Verifie qu'il est lance, puis reessaie.`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (reponse.status === 404) {
    throw new OllamaError(
      `Modele « ${modele} » introuvable sur Ollama (${cfg.hote}). ` +
        `Verifie qu'il est bien telecharge (\`ollama pull ${modele}\`).`
    );
  }

  if (!reponse.ok) {
    throw new OllamaError(`Ollama a repondu une erreur (HTTP ${reponse.status}).`);
  }

  let corps: { response?: string };
  try {
    corps = (await reponse.json()) as { response?: string };
  } catch {
    throw new OllamaError("Reponse d'Ollama illisible (pas du JSON).");
  }

  const texte = (corps.response || "").trim();
  if (!texte) {
    throw new OllamaError("Ollama a repondu sans contenu exploitable.");
  }
  return texte;
}

export function extraireTitreTexte(reponseBrute: string): { titre: string; texte: string } {
  const complet = reponseBrute.match(/TITRE\s*:\s*(.+?)\n+TEXTE\s*:\s*\n?([\s\S]*)/i);
  if (complet) {
    return { titre: complet[1].trim(), texte: complet[2].trim() };
  }

  const seulementTitre = reponseBrute.trim().match(/^TITRE\s*:\s*(.+)/i);
  if (seulementTitre && seulementTitre.index !== undefined) {
    const titre = seulementTitre[1].trim();
    const texte = reponseBrute.trim().slice(seulementTitre[0].length).trim();
    return { titre, texte };
  }

  return { titre: "", texte: reponseBrute.trim() };
}
