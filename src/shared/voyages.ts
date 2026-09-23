/**
 * Types et constantes de l'agent Voyages partages entre le serveur
 * (core/agents/voyages.ts) et le composant client (app/agents/voyages/page.tsx).
 * Volontairement sans dependance vers integrations/python-agent-runtime :
 * un import cote client de ce module ne doit jamais entrainer de code
 * serveur (undici, etc.) dans le bundle navigateur.
 */

export const TARGET_URL = "https://www.tgvinoui.sncf/informations/voyages-futurs";

export const RECUPERER_WARNING =
  "Ouvre une fenêtre Chrome locale et peut bloquer jusqu'à 5 minutes si une double authentification manuelle est nécessaire. Restez devant votre écran.";

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
