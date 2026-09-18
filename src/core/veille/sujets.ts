// Cas d'usage - cycle de vie des sujets de veille (EXG-020/021). Orchestre
// data/veille/{sujets,sources} - jamais de Prisma direct ici.

import * as sujetsData from "@/data/veille/sujets";
import * as sourcesData from "@/data/veille/sources";
import { enregistrerHistorique } from "@/data/actionHistory";
import type { ContratChamps, SourceProposee, SujetDTO, SujetResumeDTO } from "@/shared/veille/types";

type SujetAvecSources = NonNullable<Awaited<ReturnType<typeof sujetsData.obtenirSujet>>>;

function mapSujet(sujet: SujetAvecSources): SujetDTO {
  return {
    id: sujet.id,
    nom: sujet.nom,
    description: sujet.description,
    objectif: sujet.objectif,
    etat: sujet.etat,
    moteurDialogue: sujet.moteurDialogue,
    moteurAnalyse: sujet.moteurAnalyse,
    evenementsRecherches: (sujet.evenementsRecherches as string[]) ?? [],
    criteresInclusion: (sujet.criteresInclusion as string[] | null) ?? null,
    criteresExclusion: (sujet.criteresExclusion as string[] | null) ?? null,
    zoneGeographique: sujet.zoneGeographique,
    categoriesSources: (sujet.categoriesSources as SujetDTO["categoriesSources"]) ?? [],
    informationsAExtraire: (sujet.informationsAExtraire as string[]) ?? [],
    creeLe: sujet.creeLe.toISOString(),
    derniereExecutionReussieAt: sujet.derniereExecutionReussieAt?.toISOString() ?? null,
    derniereTentativeAt: sujet.derniereTentativeAt?.toISOString() ?? null,
    derniereNouveauteAt: sujet.derniereNouveauteAt?.toISOString() ?? null,
    sources: sujet.sources.map((s) => ({
      id: s.id,
      categorie: s.categorie,
      libelle: s.libelle,
      url: s.url,
      proposePar: s.proposePar,
      valide: s.valide,
    })),
  };
}

function mapResume(sujet: SujetAvecSources): SujetResumeDTO {
  return {
    id: sujet.id,
    nom: sujet.nom,
    etat: sujet.etat,
    moteurDialogue: sujet.moteurDialogue,
    moteurAnalyse: sujet.moteurAnalyse,
    derniereExecutionReussieAt: sujet.derniereExecutionReussieAt?.toISOString() ?? null,
    derniereTentativeAt: sujet.derniereTentativeAt?.toISOString() ?? null,
    nbSourcesValidees: sujet.sources.filter((s) => s.valide).length,
  };
}

function logHistorique(message: string) {
  return enregistrerHistorique({ universe: "agents", actionType: "veille", description: message });
}

export async function listerSujetsResume(): Promise<SujetResumeDTO[]> {
  const sujets = await sujetsData.listerSujets();
  return sujets.map(mapResume);
}

export async function obtenirSujet(id: string): Promise<SujetDTO | null> {
  const sujet = await sujetsData.obtenirSujet(id);
  return sujet ? mapSujet(sujet) : null;
}

export async function creerDepuisContrat(
  contrat: ContratChamps,
  sources: SourceProposee[],
  creePar: string | null
): Promise<SujetDTO> {
  const sujet = await sujetsData.creerSujet(contrat, creePar);
  if (sources.length > 0) {
    await sourcesData.remplacerSources(
      sujet.id,
      sources.map((s) => ({ ...s, proposePar: "ia" as const }))
    );
  }
  await logHistorique(`Sujet de veille « ${contrat.nom} » créé et activé.`);
  const complet = await sujetsData.obtenirSujet(sujet.id);
  return mapSujet(complet!);
}

export async function modifierContrat(
  id: string,
  contrat: ContratChamps,
  sources: SourceProposee[]
): Promise<SujetDTO> {
  await sujetsData.mettreAJourContrat(id, contrat);
  await sourcesData.remplacerSources(
    id,
    sources.map((s) => ({ ...s, proposePar: "utilisateur" as const }))
  );
  await logHistorique(`Sujet de veille « ${contrat.nom} » modifié.`);
  const complet = await sujetsData.obtenirSujet(id);
  return mapSujet(complet!);
}

export async function suspendre(id: string): Promise<void> {
  const sujet = await sujetsData.changerEtat(id, "suspendu");
  await logHistorique(`Sujet de veille « ${sujet.nom} » suspendu.`);
}

export async function reactiver(id: string): Promise<void> {
  const sujet = await sujetsData.changerEtat(id, "actif");
  await logHistorique(`Sujet de veille « ${sujet.nom} » réactivé.`);
}

// Aucune suppression sans confirmation explicite (regle de gouvernance,
// EXG-020) - "confirmation" doit avoir ete explicitement transmise par
// l'appelant (route API), jamais deduite.
export async function supprimer(id: string, confirmation: boolean): Promise<{ ok: true } | { ok: false; erreur: string }> {
  if (!confirmation) {
    return { ok: false, erreur: "Suppression refusée : confirmation explicite requise." };
  }
  const sujet = await sujetsData.obtenirSujet(id);
  if (!sujet) return { ok: false, erreur: "Sujet introuvable." };
  await sujetsData.supprimerSujet(id);
  await logHistorique(`Sujet de veille « ${sujet.nom} » supprimé.`);
  return { ok: true };
}
