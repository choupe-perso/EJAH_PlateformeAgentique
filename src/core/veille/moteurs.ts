// Seul point de la couche core/ qui mappe un MoteurId vers un adaptateur
// concret de integrations/ - agents/ et app/ ne doivent jamais importer
// integrations/ directement (regle de couches, docs/ARCHITECTURE.md 4bis).
// Aucune tentative de repli d'un moteur vers un autre ici : un appelant
// recoit "indisponible" tel quel (EXG-002/003/004).

import type { MoteurAnalyse, MoteurDialogue, MoteurId } from "@/shared/veille/moteur";
import { ollamaDialogue, ollamaAnalyse, ollamaLegerDialogue, ollamaLegerAnalyse } from "@/integrations/ollama/veilleAdapter";
import { geminiDialogue, geminiAnalyse } from "@/integrations/gemini/client";
import { chatgptDialogue, chatgptAnalyse } from "@/integrations/chatgptWeb/client";

const DIALOGUE: Record<MoteurId, MoteurDialogue> = {
  ollama: ollamaDialogue,
  ollama_leger: ollamaLegerDialogue,
  gemini: geminiDialogue,
  chatgpt: chatgptDialogue,
};

const ANALYSE: Record<MoteurId, MoteurAnalyse> = {
  ollama: ollamaAnalyse,
  ollama_leger: ollamaLegerAnalyse,
  gemini: geminiAnalyse,
  chatgpt: chatgptAnalyse,
};

export function moteurDialogue(id: MoteurId): MoteurDialogue {
  return DIALOGUE[id];
}

export function moteurAnalyse(id: MoteurId): MoteurAnalyse {
  return ANALYSE[id];
}
