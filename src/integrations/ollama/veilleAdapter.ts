// Adaptateur Veille pour Ollama - implemente MoteurDialogue/MoteurAnalyse en
// s'appuyant sur le client bas niveau existant (appelOllama, deja utilise
// par l'agent Taches). Aucune logique metier ici, uniquement le contrat
// d'acces technique (integrations/README.md). 100% local, fonctionne hors
// ligne (EXG-006).

import { appelOllama, OllamaError } from "./client";
import type { MoteurAnalyse, MoteurDialogue, MoteurId, MoteurResultat, TourDialogue } from "@/shared/veille/moteur";

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

async function appelSecurise<T>(
  prompt: string,
  mapper: (texte: string) => T,
  options: { leger?: boolean }
): Promise<MoteurResultat<T>> {
  try {
    const reponse = await appelOllama(prompt, options);
    return { status: "ok", valeur: mapper(reponse) };
  } catch (erreur) {
    if (erreur instanceof OllamaError) {
      return { status: "indisponible", raison: erreur.message };
    }
    return { status: "indisponible", raison: "Ollama : erreur inattendue." };
  }
}

// "ollama" utilise le modele principal (raisonnement, qualification) ;
// "ollama_leger" force le modele leger (voir integrations/ollama/client.ts)
// - deux entrees MoteurId distinctes pour que l'utilisateur puisse choisir
// explicitement le modele Ollama a utiliser, plutot qu'un choix cache.
function creerOllamaDialogue(id: MoteurId, options: { leger?: boolean }): MoteurDialogue {
  return {
    id,
    converser({ contexte, historique, messageUtilisateur }) {
      const prompt = `${contexte}\n\n${formaterHistorique(historique)}\nUtilisateur: ${messageUtilisateur}\nAssistant:`;
      return appelSecurise(prompt, (reponse) => ({ reponse: reponse.trim() }), options);
    },
  };
}

function creerOllamaAnalyse(id: MoteurId, options: { leger?: boolean }): MoteurAnalyse {
  return {
    id,
    extraireObservations({ contexte, contenu }) {
      const prompt = `${contexte}\n\nContenu a analyser :\n${contenu}\n\nReponds uniquement avec un tableau JSON d'observations.`;
      return appelSecurise(
        prompt,
        (reponse) => ({ observations: extraireJson<Array<Record<string, unknown>>>(reponse) ?? [] }),
        options
      );
    },
    comparerObservation({ contexte, evenementConnu, observation }) {
      const prompt =
        `${contexte}\n\nEvenement connu :\n${JSON.stringify(evenementConnu)}\n\n` +
        `Nouvelle observation :\n${JSON.stringify(observation)}\n\n` +
        `Reponds uniquement avec un objet JSON {"identique": bool, "modifie": bool}.`;
      return appelSecurise(
        prompt,
        (reponse) => extraireJson<{ identique: boolean; modifie: boolean }>(reponse) ?? { identique: false, modifie: false },
        options
      );
    },
  };
}

export const ollamaDialogue = creerOllamaDialogue("ollama", {});
export const ollamaLegerDialogue = creerOllamaDialogue("ollama_leger", { leger: true });
export const ollamaAnalyse = creerOllamaAnalyse("ollama", {});
export const ollamaLegerAnalyse = creerOllamaAnalyse("ollama_leger", { leger: true });
