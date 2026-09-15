// Cas d'usage de l'agent Voyages - orchestre integrations/sncf et
// shared/ics, appele par les routes API. Porte depuis l'ancienne
// plateforme Flask (agents/generateur_ics_sncf/routes.py).

import {
  enregistrerIdentifiants as enregistrerIdentifiantsSncf,
  identifiantsConfigures as identifiantsConfiguresSncf,
} from "@/integrations/sncf/credentials";
import { recupererVoyages as recupererVoyagesSncf, type Voyage } from "@/integrations/sncf/scraping";
import { validerVoyage } from "@/agents/voyages/validation";
import { construireCalendrier, echapperTexteIcs, formaterDateTimeLocale, lignesValarm } from "@/shared/ics";
import { enregistrerHistorique } from "@/data/actionHistory";

const DUREE_TRAJET_MS = 60 * 60 * 1000;

function logHistorique(message: string, statut: "succes" | "erreur" = "succes") {
  return enregistrerHistorique({
    universe: "agents",
    actionType: "generateur_ics_sncf",
    description: statut === "erreur" ? `[erreur] ${message}` : message,
  });
}

export function identifiantsConfigures(): boolean {
  return identifiantsConfiguresSncf();
}

export async function enregistrerIdentifiants(email: string, motDePasse: string): Promise<void> {
  enregistrerIdentifiantsSncf(email, motDePasse);
  await logHistorique("Identifiants SNCF Connect enregistres.");
}

export async function recupererVoyages(): Promise<
  { ok: true; voyages: Voyage[] } | { ok: false; erreur: string }
> {
  try {
    const voyages = await recupererVoyagesSncf();
    await logHistorique(`${voyages.length} voyage(s) SNCF recupere(s).`);
    return { ok: true, voyages };
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "Erreur inattendue.";
    await logHistorique(`Recuperation des voyages SNCF : ${message}`, "erreur");
    return { ok: false, erreur: message };
  }
}

function debutVoyage(voyage: Voyage): Date {
  return new Date(voyage.annee, voyage.mois - 1, voyage.jour, voyage.heureDepart[0], voyage.heureDepart[1]);
}

function lignesVeventTrajet(voyage: Voyage, debut: Date): string[] {
  const debutTrajet = new Date(debut.getTime() - DUREE_TRAJET_MS);
  const description = `Trajet avant le train ${voyage.trainNumero} (${voyage.gareDepart} → ${voyage.gareArrivee}).`;

  return [
    "BEGIN:VEVENT",
    `UID:generateur-ics-sncf-${voyage.id}-trajet-${crypto.randomUUID()}@ejah.local`,
    `DTSTAMP:${formaterDateTimeLocale(new Date())}`,
    `DTSTART:${formaterDateTimeLocale(debutTrajet)}`,
    `DTEND:${formaterDateTimeLocale(debut)}`,
    "SUMMARY:Trajet",
    `LOCATION:${echapperTexteIcs(voyage.gareDepart)}`,
    `DESCRIPTION:${echapperTexteIcs(description)}`,
    ...lignesValarm("Trajet", "-PT1H"),
    "END:VEVENT",
  ];
}

function lignesVeventVoyage(voyage: Voyage, debut: Date): string[] {
  let fin = new Date(voyage.annee, voyage.mois - 1, voyage.jour, voyage.heureArrivee[0], voyage.heureArrivee[1]);
  if (fin <= debut) {
    fin = new Date(fin.getTime() + 24 * 60 * 60 * 1000);
  }

  const resume = `Train ${voyage.gareDepart} → ${voyage.gareArrivee} (${voyage.trainNumero})`;
  const description = [
    `Dossier : ${voyage.dossier}`,
    `Train : ${voyage.trainNumero}`,
    `Duree : ${voyage.duree}`,
    `De ${voyage.gareDepart} a ${voyage.gareArrivee}`,
  ].join("\n");

  return [
    "BEGIN:VEVENT",
    `UID:generateur-ics-sncf-${voyage.id}-${crypto.randomUUID()}@ejah.local`,
    `DTSTAMP:${formaterDateTimeLocale(new Date())}`,
    `DTSTART:${formaterDateTimeLocale(debut)}`,
    `DTEND:${formaterDateTimeLocale(fin)}`,
    `SUMMARY:${echapperTexteIcs(resume)}`,
    `LOCATION:${echapperTexteIcs(voyage.gareDepart)}`,
    `DESCRIPTION:${echapperTexteIcs(description)}`,
    ...lignesValarm(resume, "-PT1H"),
    "END:VEVENT",
  ];
}

export async function genererIcsVoyages(
  voyages: unknown
): Promise<{ ok: true; contenu: string } | { ok: false; erreurs: string[] }> {
  if (!Array.isArray(voyages) || voyages.length === 0) {
    return { ok: false, erreurs: ["Aucun voyage selectionne."] };
  }
  if (!voyages.every(validerVoyage)) {
    return { ok: false, erreurs: ["Donnees de voyage invalides."] };
  }

  const lignes: string[] = [];
  for (const voyage of voyages as Voyage[]) {
    const debut = debutVoyage(voyage);
    lignes.push(...lignesVeventTrajet(voyage, debut));
    lignes.push(...lignesVeventVoyage(voyage, debut));
  }

  const contenu = construireCalendrier(lignes);
  await logHistorique(`Calendrier .ics genere pour ${voyages.length} voyage(s).`);
  return { ok: true, contenu };
}
