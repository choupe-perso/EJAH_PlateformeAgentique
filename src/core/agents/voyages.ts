/**
 * Cas d'usage "agent voyages" : orchestre l'appel technique
 * (integrations/python-agent-runtime.ts). Pas de gate d'accès ni
 * d'avertissement légal ici (à la différence d'anonymizer) - agent
 * personnel, catégorie "Perso" (voir python/agents/voyages/README.md).
 *
 * Pas d'étape "identifiants" côté web (décision explicite du 2026-09-22,
 * voir README ÉCART PLATEFORME) : l'utilisateur se connecte toujours
 * lui-même dans la fenêtre Chrome ouverte par "recuperer" - ce profil
 * Chrome dédié (distinct du navigateur habituel) mémorise ensuite la
 * session comme un navigateur normal.
 *
 * Avertissement porté par ce module (voir README §2, pas dans
 * contract.yaml) : "recuperer" ouvre une vraie fenêtre Chrome locale et
 * peut bloquer jusqu'à 5 minutes (2FA manuelle) - ce n'est pas un appel
 * HTTP synchrone classique. Réservé à un poste local avec un utilisateur
 * présent ; jamais appelé depuis un serveur distant.
 */
import {
  executePythonAgent,
  getPythonAgentProgress,
  listPythonAgents,
  type PythonAgentSummary,
} from "@/integrations/python-agent-runtime";

const AGENT_ID = "voyages";

export const TARGET_URL = "https://www.tgvinoui.sncf/informations/voyages-futurs";

export const RECUPERER_WARNING =
  "Ouvre une fenêtre Chrome locale et peut bloquer jusqu'à 5 minutes si une double authentification manuelle est nécessaire. Restez devant votre écran.";

export async function getVoyagesSummary(): Promise<PythonAgentSummary> {
  const agents = await listPythonAgents();
  const agent = agents.find((a) => a.id === AGENT_ID);
  if (!agent) {
    throw new Error(
      `Agent '${AGENT_ID}' non trouvé sur la gateway Python - vérifiez qu'il est bien installé sous python/agents/.`
    );
  }
  return agent;
}

interface VoyagesRawResult {
  command: string;
  message: string;
  configures: boolean | null;
  voyages: Voyage[] | null;
  ics_contenu: string | null;
  error: string | null;
  error_kind: "validation" | "configuration" | "integration" | "technique" | null;
}

export interface Voyage {
  id: string;
  dossier: string;
  annee: number;
  mois: number;
  jour: number;
  heure_depart: [number, number];
  heure_arrivee: [number, number];
  gare_depart: string;
  gare_arrivee: string;
  train_numero: string;
  duree: string;
}

/** État réel remonté par scraping.py::recuperer_voyages pendant l'appel en
 * cours (voir python/agents/voyages/web_adapter.py) - "idle" est une valeur
 * locale (aucun appel en cours ou état non encore écrit). */
export type RecupererPhase = "idle" | "authentification" | "scraping";

export async function getRecupererProgress(): Promise<RecupererPhase> {
  const { state } = await getPythonAgentProgress(AGENT_ID);
  if (state === "authentification" || state === "scraping") return state;
  return "idle";
}

export interface RecupererVoyagesResult {
  message: string;
  voyages: Voyage[];
  error: string | null;
  errorKind: string | null;
}

export async function recupererVoyages(): Promise<RecupererVoyagesResult> {
  // headless toujours false : une session sans fenêtre visible rend
  // impossible une authentification à deux facteurs manuelle (voir
  // contract.yaml et README §2).
  const raw = await executePythonAgent<VoyagesRawResult>(AGENT_ID, {
    command: "recuperer",
    fields: { headless: false },
  });
  return {
    message: raw.message,
    voyages: raw.voyages ?? [],
    error: raw.error,
    errorKind: raw.error_kind,
  };
}

export interface GenererIcsResult {
  message: string;
  icsContenu: string | null;
  error: string | null;
  errorKind: string | null;
}

export async function genererIcs(voyages: Voyage[]): Promise<GenererIcsResult> {
  if (!voyages || voyages.length === 0) {
    throw new Error("Aucun voyage sélectionné.");
  }
  const raw = await executePythonAgent<VoyagesRawResult>(AGENT_ID, {
    command: "generer",
    fields: { voyages },
  });
  return {
    message: raw.message,
    icsContenu: raw.ics_contenu,
    error: raw.error,
    errorKind: raw.error_kind,
  };
}
