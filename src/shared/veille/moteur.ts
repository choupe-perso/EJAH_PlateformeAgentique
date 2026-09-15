// Contrat commun aux moteurs IA utilisables par la veille (Ollama, Gemini,
// ChatGPT Web), pour le role dialogue (qualification) et le role analyse
// (extraction). Union discriminee "ok" | "indisponible" : un appelant ne
// doit JAMAIS rattraper un "indisponible" pour retenter avec un autre
// moteur (EXG-002/003/004/092) - voir src/core/veille/moteurs.ts, seul
// point qui mappe un MoteurId vers un adaptateur concret.

import type { VeilleMoteur } from "@prisma/client";

export type MoteurId = VeilleMoteur;

export type MoteurResultat<T> =
  | { status: "ok"; valeur: T }
  | { status: "indisponible"; raison: string };

export type TourDialogue = {
  role: "utilisateur" | "assistant";
  contenu: string;
};

export interface MoteurDialogue {
  readonly id: MoteurId;
  converser(params: {
    contexte: string;
    historique: TourDialogue[];
    messageUtilisateur: string;
  }): Promise<MoteurResultat<{ reponse: string }>>;
}

export interface MoteurAnalyse {
  readonly id: MoteurId;
  extraireObservations(params: {
    contexte: string;
    contenu: string;
  }): Promise<MoteurResultat<{ observations: Array<Record<string, unknown>> }>>;
  comparerObservation(params: {
    contexte: string;
    evenementConnu: Record<string, unknown>;
    observation: Record<string, unknown>;
  }): Promise<MoteurResultat<{ identique: boolean; modifie: boolean }>>;
}
