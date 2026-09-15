// Redaction assistee (email / prompt) via un serveur Ollama local.
// Porte depuis l'ancienne plateforme Flask (agents/todos_transport/ollama_client.py).
//
// Injoignable ou mal configure ne doit jamais bloquer le reste de l'agent -
// voir OllamaError, remontee proprement par les cas d'usage (src/core).

const HOTE_PAR_DEFAUT = "http://localhost:11434";
const MODELE_PAR_DEFAUT = "qwen3:8b";
const DELAI_MAX_MS = 180_000;

function configuration() {
  return {
    hote: process.env.OLLAMA_HOST || HOTE_PAR_DEFAUT,
    modele: process.env.OLLAMA_MODEL || MODELE_PAR_DEFAUT,
  };
}

export class OllamaError extends Error {}

export async function appelOllama(prompt: string): Promise<string> {
  const cfg = configuration();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DELAI_MAX_MS);

  let reponse: Response;
  try {
    reponse = await fetch(`${cfg.hote}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: cfg.modele, prompt, stream: false }),
      signal: controller.signal,
    });
  } catch (erreur) {
    if (erreur instanceof Error && erreur.name === "AbortError") {
      throw new OllamaError(
        `Ollama (${cfg.hote}) n'a pas repondu en ${DELAI_MAX_MS / 1000}s. ` +
          `Le modele « ${cfg.modele} » est peut-etre en cours de chargement en memoire ` +
          `(premier appel apres demarrage) : reessaie dans quelques instants.`
      );
    }
    throw new OllamaError(`Ollama injoignable sur ${cfg.hote}. Verifie qu'il est lance, puis reessaie.`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (reponse.status === 404) {
    throw new OllamaError(
      `Modele « ${cfg.modele} » introuvable sur Ollama (${cfg.hote}). ` +
        `Verifie qu'il est bien telecharge (\`ollama pull ${cfg.modele}\`).`
    );
  }

  if (!reponse.ok) {
    throw new OllamaError(`Ollama a repondu une erreur (HTTP ${reponse.status}).`);
  }

  let corps: { response?: string };
  try {
    corps = await reponse.json();
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
