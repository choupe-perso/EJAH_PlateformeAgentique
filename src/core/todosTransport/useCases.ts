// Cas d'usage de l'agent Taches - orchestre data/ et integrations/, appele
// par les routes API (jamais l'inverse). Porte depuis l'ancienne plateforme
// Flask (agents/todos_transport/routes.py).

import * as todosTransportData from "@/data/todosTransport";
import { enregistrerHistorique } from "@/data/actionHistory";
import { construireCalendrier, echapperTexteIcs, formaterDateTimeLocale, lignesValarm } from "@/shared/ics";
import {
  redigerEmail as redigerEmailOllama,
  reecrireEmail as reecrireEmailOllama,
  redigerPrompt as redigerPromptOllama,
  reecrirePrompt as reecrirePromptOllama,
  type Registre,
  type Ton,
  type LongueurMail,
  type NiveauPrompt,
} from "@/integrations/ollama/redactionTransport";
import { validerTache } from "@/agents/todosTransport/validation";
import type { TodoTransportStatut, TodoTransportType } from "@prisma/client";

const LIBELLES_TYPE: Record<string, string> = { rdv: "RDV", email: "Email", prompt: "Prompt" };

function logHistorique(message: string) {
  return enregistrerHistorique({
    universe: "agents",
    actionType: "todos_transport",
    description: message,
  });
}

export async function creerTache(
  type: string,
  titre: string,
  corps: Record<string, unknown>
): Promise<{ ok: true; id: string } | { ok: false; erreurs: string[] }> {
  const erreurs = validerTache(type, corps as never);
  if (erreurs.length > 0) {
    return { ok: false, erreurs };
  }

  let tache;
  if (type === "rdv") {
    tache = await todosTransportData.creerTache({
      type: "rdv",
      titre,
      rdvDateDebut: new Date(corps.dateDebut as string),
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

  await logHistorique(`${LIBELLES_TYPE[type] ?? type} « ${titre} » enregistre.`);
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
    await logHistorique(`${LIBELLES_TYPE[tache.type] ?? tache.type} « ${tache.titre} » marque traite.`);
  }
  return trouve;
}

export async function genererIcsPourTache(id: string): Promise<string | null> {
  const tache = await todosTransportData.obtenirTache(id);
  if (!tache || tache.type !== "rdv" || !tache.rdvDateDebut || !tache.rdvDureeMinutes || !tache.rdvAlerteMinutes) {
    return null;
  }

  const debut = tache.rdvDateDebut;
  const lignes = [
    "BEGIN:VEVENT",
    `UID:todos-transport-${tache.id}-${crypto.randomUUID()}@ejah.local`,
    `DTSTAMP:${formaterDateTimeLocale(new Date())}`,
    `DTSTART:${formaterDateTimeLocale(debut)}`,
    `DURATION:PT${tache.rdvDureeMinutes}M`,
    `SUMMARY:${echapperTexteIcs(tache.titre)}`,
    ...(tache.rdvDescription ? [`DESCRIPTION:${echapperTexteIcs(tache.rdvDescription)}`] : []),
    ...lignesValarm(tache.titre, `-PT${tache.rdvAlerteMinutes}M`),
    "END:VEVENT",
  ];

  const contenu = construireCalendrier(lignes);
  await todosTransportData.marquerTraite(id);
  await logHistorique(`RDV « ${tache.titre} » marque traite (export .ics).`);
  return contenu;
}

export async function redigerBrouillonEmail(params: {
  destinataire: string;
  notes: string;
  registre: Registre;
  ton: Ton;
  longueur: LongueurMail;
}) {
  return redigerEmailOllama(params);
}

export async function reecrireBrouillonEmail(params: {
  destinataire: string;
  titreActuel: string;
  texteActuel: string;
  precisions: string;
  registre: Registre;
  ton: Ton;
  longueur: LongueurMail;
}) {
  return reecrireEmailOllama(params);
}

export async function redigerBrouillonPrompt(params: {
  ia: string;
  projet: string;
  titre: string;
  notes: string;
  niveau: NiveauPrompt;
}) {
  return redigerPromptOllama(params);
}

export async function reecrireBrouillonPrompt(params: {
  ia: string;
  projet: string;
  titre: string;
  texteActuel: string;
  precisions: string;
  niveau: NiveauPrompt;
}) {
  return reecrirePromptOllama(params);
}
