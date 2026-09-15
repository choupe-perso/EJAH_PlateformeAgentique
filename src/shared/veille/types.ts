// Types partages de l'agent Veille - utilises par core/, app/ et les
// composants UI. Ne depend d'aucune autre couche (regle shared/README.md).

import type {
  VeilleMoteur,
  VeilleSujetEtat,
  VeilleSourceCategorie,
  VeilleSourceOrigine,
  VeilleEvenementStatut,
  VeilleExecutionStatut,
  VeilleExecutionType,
  VeilleDeclencheur,
} from "@prisma/client";

export type {
  VeilleMoteur,
  VeilleSujetEtat,
  VeilleSourceCategorie,
  VeilleSourceOrigine,
  VeilleEvenementStatut,
  VeilleExecutionStatut,
  VeilleExecutionType,
  VeilleDeclencheur,
};

export const CATEGORIES_SOURCE: VeilleSourceCategorie[] = ["officielle", "reseau_social", "ecommerce"];
export const MOTEURS: VeilleMoteur[] = ["ollama", "gemini", "chatgpt"];

export const LIBELLE_MOTEUR: Record<VeilleMoteur, string> = {
  ollama: "Ollama (local)",
  gemini: "Gemini",
  chatgpt: "ChatGPT (Web)",
};

export const LIBELLE_CATEGORIE: Record<VeilleSourceCategorie, string> = {
  officielle: "Officielle",
  reseau_social: "Réseau social",
  ecommerce: "E-commerce",
};

export type SourceDTO = {
  id: string;
  categorie: VeilleSourceCategorie;
  libelle: string;
  url: string | null;
  proposePar: VeilleSourceOrigine;
  valide: boolean;
};

export type SourceProposee = {
  categorie: VeilleSourceCategorie;
  libelle: string;
  url: string | null;
};

// Champs du contrat de surveillance (section 6 de la spec), communs a un
// brouillon en cours de qualification et a un sujet deja persiste.
export type ContratChamps = {
  nom: string;
  description: string | null;
  objectif: string;
  moteurDialogue: VeilleMoteur;
  moteurAnalyse: VeilleMoteur;
  evenementsRecherches: string[];
  criteresInclusion: string[] | null;
  criteresExclusion: string[] | null;
  zoneGeographique: string | null;
  categoriesSources: VeilleSourceCategorie[];
  informationsAExtraire: string[];
};

export type ContratBrouillon = ContratChamps & {
  sources: SourceProposee[];
};

export type SujetDTO = ContratChamps & {
  id: string;
  etat: VeilleSujetEtat;
  creeLe: string;
  derniereExecutionReussieAt: string | null;
  derniereTentativeAt: string | null;
  derniereNouveauteAt: string | null;
  sources: SourceDTO[];
};

export type SujetResumeDTO = {
  id: string;
  nom: string;
  etat: VeilleSujetEtat;
  moteurDialogue: VeilleMoteur;
  moteurAnalyse: VeilleMoteur;
  derniereExecutionReussieAt: string | null;
  derniereTentativeAt: string | null;
  nbSourcesValidees: number;
};

export type EvenementDTO = {
  id: string;
  sujetId: string;
  sujetNom: string;
  statut: VeilleEvenementStatut;
  titre: string;
  resume: string;
  donnees: Record<string, unknown>;
  sources: { id: string; libelle: string; url: string | null }[];
  premiereDetectionAt: string;
  derniereDetectionAt: string;
  lu: boolean;
};

export type EvenementVersionDTO = {
  id: string;
  donneesAvant: Record<string, unknown> | null;
  donneesApres: Record<string, unknown>;
  detecteAt: string;
};

export type TraceabiliteDTO = {
  evenement: EvenementDTO;
  versions: EvenementVersionDTO[];
  observations: Array<{
    id: string;
    donneesExtraites: Record<string, unknown>;
    creeLe: string;
    collecte: {
      id: string;
      recupereAt: string;
      source: { id: string; libelle: string; url: string | null };
    };
  }>;
};

export type SyntheseVeille = {
  sujetsActifs: number;
  nouveautes: number;
  nonLus: number;
  derniereExecution: {
    demarreeAt: string;
    termineeAt: string | null;
    statut: VeilleExecutionStatut;
  } | null;
};

export type PeriodeHistorique = "aujourdhui" | "7j" | "30j" | "tout";

export type ExecutionSujetResultatDTO = {
  sujetId: string;
  sujetNom: string;
  statut: VeilleExecutionStatut;
  erreur: string | null;
  nbNouveautes: number;
};

export type ExecutionResultatDTO = {
  id: string;
  type: VeilleExecutionType;
  declencheur: VeilleDeclencheur;
  statut: VeilleExecutionStatut;
  demarreeAt: string;
  termineeAt: string | null;
  sujets: ExecutionSujetResultatDTO[];
};
