/**
 * Cas d'usage "agent taches" : orchestre l'appel technique
 * (integrations/python-agent-runtime.ts) et la persistance (data/) - le
 * cœur Python (python/agents/taches/) ne stocke rien lui-même (voir
 * python/agents/taches/README.md section "Stockage").
 *
 * Règle EJAH (référentiel §31, voir aussi python/agents/taches/README.md
 * section "Anti-patterns interdits") : validation, réécriture Ollama et
 * construction du .ics ne sont JAMAIS ré-implémentées ici - toujours
 * déléguées au cœur Python via l'agent "taches" de la gateway.
 */
import {
  executePythonAgent,
  listPythonAgents,
  type PythonAgentSummary,
} from "@/integrations/python-agent-runtime";
import * as todosTransportData from "@/data/todosTransport";
import { enregistrerHistorique } from "@/data/actionHistory";
import type { TodoTransportStatut, TodoTransportType } from "@prisma/client";

const AGENT_ID = "taches";

const LIBELLES_TYPE: Record<string, string> = { rdv: "RDV", email: "Email", prompt: "Prompt" };

/**
 * Convertit une chaîne "flottante" (heure murale sans fuseau, ex. la valeur
 * d'un <input type="datetime-local"> : "2026-10-05T09:00") en Date, en
 * traitant ses chiffres comme s'ils étaient déjà UTC - jamais comme l'heure
 * locale du processus Node. Sans ce garde-fou, `new Date(chaîne)` interprète
 * une chaîne sans fuseau comme l'heure locale du SERVEUR (spec ECMA-262) :
 * le round-trip vers une colonne Postgres `timestamp` (sans fuseau, qui ne
 * fait aucune conversion) déciderait alors silencieusement du décalage
 * DST/fuseau du serveur au moment de l'écriture, ce qui décale l'heure
 * affichée dans le calendrier de l'utilisateur (constaté : 2h d'écart en
 * heure d'été si le serveur ne tourne pas dans le même fuseau que
 * l'utilisateur).
 */
function versDateFlottante(chaine: string): Date {
  const sansFuseau = chaine.replace(/(Z|[+-]\d{2}:?\d{2})$/, "");
  return new Date(sansFuseau.length === 16 ? `${sansFuseau}:00Z` : `${sansFuseau}Z`);
}

/** Opération inverse : relit une Date issue de Prisma (elle-même déjà
 * "flottante" par construction, voir versDateFlottante) en chaîne ISO sans
 * fuseau, pour transmission au cœur Python (contract.yaml : dateDebut). */
function depuisDateFlottante(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "").replace("Z", "");
}

function logHistorique(message: string) {
  return enregistrerHistorique({
    universe: "agents",
    actionType: "taches",
    description: message,
  });
}

export async function getTachesSummary(): Promise<PythonAgentSummary> {
  const agents = await listPythonAgents();
  const agent = agents.find((a) => a.id === AGENT_ID);
  if (!agent) {
    throw new Error(
      `Agent '${AGENT_ID}' non trouvé sur la gateway Python - vérifiez qu'il est bien installé sous python/agents/.`
    );
  }
  return agent;
}

interface TachesRawResult {
  command: string;
  message: string;
  erreurs: string[];
  titre: string | null;
  texte: string | null;
  ics_contenu: string | null;
  error: string | null;
  error_kind: "validation" | "configuration" | "integration" | "technique" | null;
}

export type TypeTache = "rdv" | "email" | "prompt";

export type DonneesRdv = { titre?: string; dateDebut?: string; dureeMinutes?: number | string; alerteMinutes?: number | string };
export type DonneesEmail = { destinataire?: string; titre?: string; texte?: string };
export type DonneesPrompt = { ia?: string; projet?: string; titre?: string; texte?: string };

export async function validerTache(
  type: TypeTache,
  donnees: DonneesRdv | DonneesEmail | DonneesPrompt
): Promise<string[]> {
  const champs = donnees as Record<string, string | number | undefined>;
  const raw = await executePythonAgent<TachesRawResult>(AGENT_ID, {
    command: "valider",
    fields: {
      type,
      titre: champs.titre != null ? String(champs.titre) : undefined,
      dateDebut: (donnees as DonneesRdv).dateDebut,
      dureeMinutes: champs.dureeMinutes != null ? String(champs.dureeMinutes) : undefined,
      alerteMinutes: champs.alerteMinutes != null ? String(champs.alerteMinutes) : undefined,
      destinataire: (donnees as DonneesEmail).destinataire,
      texte: (donnees as DonneesEmail | DonneesPrompt).texte,
      ia: (donnees as DonneesPrompt).ia,
      projet: (donnees as DonneesPrompt).projet,
    },
  });
  return raw.erreurs;
}

export async function creerTache(
  type: TypeTache,
  titre: string,
  corps: Record<string, unknown>
): Promise<{ ok: true; id: string } | { ok: false; erreurs: string[] }> {
  const erreurs = await validerTache(type, { ...corps, titre } as never);
  if (erreurs.length > 0) {
    return { ok: false, erreurs };
  }

  let tache;
  if (type === "rdv") {
    tache = await todosTransportData.creerTache({
      type: "rdv",
      titre,
      rdvDateDebut: versDateFlottante(corps.dateDebut as string),
      rdvDureeMinutes: Number(corps.dureeMinutes),
      rdvAlerteMinutes: Number(corps.alerteMinutes),
      rdvDescription: (corps.description as string) || undefined,
    });
  } else if (type === "email") {
    tache = await todosTransportData.creerTache({
      type: "email",
      titre,
      emailDestinataire: corps.destinataire as string,
      emailNotesBrutes: (corps.notesBrutes as string) || undefined,
      emailTexte: corps.texte as string,
    });
  } else {
    tache = await todosTransportData.creerTache({
      type: "prompt",
      titre,
      promptIa: corps.ia as string,
      promptProjet: corps.projet as string,
      promptNotesBrutes: (corps.notesBrutes as string) || undefined,
      promptTexte: corps.texte as string,
    });
  }

  await logHistorique(`${LIBELLES_TYPE[type] ?? type} « ${titre} » enregistré.`);
  return { ok: true, id: tache.id };
}

export function listerTaches(filtres: {
  statut?: TodoTransportStatut | null;
  type?: TodoTransportType | null;
  titreRecherche?: string | null;
}) {
  return todosTransportData.listerTaches(filtres);
}

export async function marquerTraite(id: string): Promise<boolean> {
  const tache = await todosTransportData.obtenirTache(id);
  const trouve = await todosTransportData.marquerTraite(id);
  if (trouve && tache) {
    await logHistorique(`${LIBELLES_TYPE[tache.type] ?? tache.type} « ${tache.titre} » marqué traité.`);
  }
  return trouve;
}

export async function genererIcsPourTache(id: string): Promise<string | null> {
  const tache = await todosTransportData.obtenirTache(id);
  if (!tache || tache.type !== "rdv" || !tache.rdvDateDebut || !tache.rdvDureeMinutes || !tache.rdvAlerteMinutes) {
    return null;
  }

  const raw = await executePythonAgent<TachesRawResult>(AGENT_ID, {
    command: "generer_ics",
    fields: {
      id: tache.id,
      titre: tache.titre,
      dateDebut: depuisDateFlottante(tache.rdvDateDebut),
      dureeMinutes: String(tache.rdvDureeMinutes),
      alerteMinutes: String(tache.rdvAlerteMinutes),
      description: tache.rdvDescription ?? undefined,
    },
  });
  if (raw.error || !raw.ics_contenu) {
    throw new Error(raw.error ?? "Échec de génération du .ics.");
  }

  await todosTransportData.marquerTraite(id);
  await logHistorique(`RDV « ${tache.titre} » marqué traité (export .ics).`);
  return raw.ics_contenu;
}

export type Registre = "tutoiement" | "vouvoiement";
export type Ton = "formel" | "professionnel" | "proche" | "amical";
export type LongueurMail = "tres_court" | "court" | "developpe";
export type NiveauPrompt = "rapide" | "structure" | "complet" | "expert";

export interface BrouillonEmail {
  titre: string;
  texte: string;
}

export async function redigerBrouillonEmail(params: {
  destinataire: string;
  notes: string;
  registre: Registre;
  ton: Ton;
  longueur: LongueurMail;
}): Promise<BrouillonEmail> {
  const raw = await executePythonAgent<TachesRawResult>(AGENT_ID, {
    command: "rediger_brouillon",
    fields: { type: "email", ...params },
  });
  if (raw.error) throw new Error(raw.error);
  return { titre: raw.titre ?? "", texte: raw.texte ?? "" };
}

export async function reecrireBrouillonEmail(params: {
  destinataire: string;
  titreActuel: string;
  texteActuel: string;
  precisions: string;
  registre: Registre;
  ton: Ton;
  longueur: LongueurMail;
}): Promise<BrouillonEmail> {
  const raw = await executePythonAgent<TachesRawResult>(AGENT_ID, {
    command: "reecrire_brouillon",
    fields: { type: "email", ...params },
  });
  if (raw.error) throw new Error(raw.error);
  return { titre: raw.titre ?? "", texte: raw.texte ?? "" };
}

export async function redigerBrouillonPrompt(params: {
  ia: string;
  projet: string;
  titre: string;
  notes: string;
  niveau: NiveauPrompt;
}): Promise<{ texte: string }> {
  const raw = await executePythonAgent<TachesRawResult>(AGENT_ID, {
    command: "rediger_brouillon",
    fields: { type: "prompt", ...params },
  });
  if (raw.error) throw new Error(raw.error);
  return { texte: raw.texte ?? "" };
}

export async function reecrireBrouillonPrompt(params: {
  ia: string;
  projet: string;
  titre: string;
  texteActuel: string;
  precisions: string;
  niveau: NiveauPrompt;
}): Promise<{ texte: string }> {
  const raw = await executePythonAgent<TachesRawResult>(AGENT_ID, {
    command: "reecrire_brouillon",
    fields: { type: "prompt", ...params },
  });
  if (raw.error) throw new Error(raw.error);
  return { texte: raw.texte ?? "" };
}
