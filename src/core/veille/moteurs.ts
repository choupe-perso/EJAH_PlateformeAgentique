// Seul point de la couche core/ qui mappe un MoteurId vers un adaptateur
// concret de integrations/ - agents/ et app/ ne doivent jamais importer
// integrations/ directement (regle de couches, docs/ARCHITECTURE.md 4bis).
// Aucune tentative de repli d'un moteur vers un autre ici : un appelant
// recoit "indisponible" tel quel (EXG-002/003/004).

import type { MoteurAnalyse, MoteurDialogue, MoteurId } from "@/shared/veille/moteur";
import { ollamaDialogue, ollamaAnalyse } from "@/integrations/ollama/veilleAdapter";
import { geminiDialogue, geminiAnalyse } from "@/integrations/gemini/client";
import { chatgptDialogue, chatgptAnalyse } from "@/integrations/chatgptWeb/client";

const DIALOGUE: Record<MoteurId, MoteurDialogue> = {
  ollama: ollamaDialogue,
  gemini: geminiDialogue,
  chatgpt: chatgptDialogue,
};

const ANALYSE: Record<MoteurId, MoteurAnalyse> = {
  ollama: ollamaAnalyse,
  gemini: geminiAnalyse,
  chatgpt: chatgptAnalyse,
};

export function moteurDialogue(id: MoteurId): MoteurDialogue {
  return DIALOGUE[id];
}

export function moteurAnalyse(id: MoteurId): MoteurAnalyse {
  return ANALYSE[id];
}
