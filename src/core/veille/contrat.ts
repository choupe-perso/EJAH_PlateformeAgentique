// Cas d'usage - normalisation et reformulation du contrat de surveillance
// (EXG-016). La reformulation est construite deterministiquement (pas
// d'appel IA supplementaire) : plus fiable, plus econome en quota gratuit.

import { LIBELLE_CATEGORIE, LIBELLE_MOTEUR } from "@/shared/veille/types";
import type { ContratChamps, SourceProposee } from "@/shared/veille/types";
import type { MoteurId } from "@/shared/veille/moteur";

export function normaliserBrouillon(
  brouillon: Partial<ContratChamps>,
  moteurDialogue: MoteurId,
  moteurAnalyse: MoteurId
): ContratChamps {
  return {
    nom: brouillon.nom?.trim() || "Sujet de veille",
    description: brouillon.description?.trim() || null,
    objectif: brouillon.objectif?.trim() || "",
    moteurDialogue,
    moteurAnalyse,
    evenementsRecherches: brouillon.evenementsRecherches ?? [],
    criteresInclusion: brouillon.criteresInclusion ?? null,
    criteresExclusion: brouillon.criteresExclusion ?? null,
    zoneGeographique: brouillon.zoneGeographique ?? null,
    categoriesSources: brouillon.categoriesSources ?? [],
    informationsAExtraire: brouillon.informationsAExtraire ?? [],
  };
}

export function reformulerContrat(contrat: ContratChamps, sources: SourceProposee[]): string {
  const lignes: string[] = [];
  lignes.push(`Sujet : ${contrat.nom}`);
  lignes.push(`Objectif : ${contrat.objectif || "(non précisé)"}`);
  if (contrat.evenementsRecherches.length) {
    lignes.push(`Événements recherchés : ${contrat.evenementsRecherches.join(", ")}`);
  }
  if (contrat.criteresInclusion?.length) {
    lignes.push(`Critères d'inclusion : ${contrat.criteresInclusion.join(", ")}`);
  }
  if (contrat.criteresExclusion?.length) {
    lignes.push(`Critères d'exclusion : ${contrat.criteresExclusion.join(", ")}`);
  }
  if (contrat.zoneGeographique) {
    lignes.push(`Zone géographique : ${contrat.zoneGeographique}`);
  }
  if (contrat.informationsAExtraire.length) {
    lignes.push(`Informations à extraire : ${contrat.informationsAExtraire.join(", ")}`);
  }
  lignes.push(
    `Catégories de sources : ${contrat.categoriesSources.map((c) => LIBELLE_CATEGORIE[c]).join(", ") || "(aucune)"}`
  );
  lignes.push(
    `Sources proposées (${sources.length}) : ` +
      (sources.length ? sources.map((s) => `${s.libelle} [${LIBELLE_CATEGORIE[s.categorie]}]`).join(", ") : "aucune")
  );
  lignes.push(`Moteur de dialogue : ${LIBELLE_MOTEUR[contrat.moteurDialogue]}`);
  lignes.push(`Moteur d'analyse : ${LIBELLE_MOTEUR[contrat.moteurAnalyse]}`);
  return lignes.join("\n");
}

export function contratValide(contrat: ContratChamps, sources: SourceProposee[]): string[] {
  const erreurs: string[] = [];
  if (!contrat.nom.trim()) erreurs.push("Le nom du sujet est requis.");
  if (!contrat.objectif.trim()) erreurs.push("L'objectif est requis.");
  if (sources.length === 0) erreurs.push("Au moins une source validée est requise.");
  return erreurs;
}
