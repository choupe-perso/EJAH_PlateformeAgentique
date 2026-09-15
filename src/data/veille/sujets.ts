// Adaptateur de persistance - sujets de veille (voir prisma/schema.prisma,
// modele VeilleSujet). Aucune logique metier ici (data/README.md).

import { prisma } from "@/data/db";
import type { ContratChamps } from "@/shared/veille/types";
import type { VeilleSujetEtat } from "@prisma/client";

const AVEC_SOURCES = { sources: { orderBy: { creeLe: "asc" as const } } };

export function listerSujets(filtres: { etat?: VeilleSujetEtat | null } = {}) {
  return prisma.veilleSujet.findMany({
    where: filtres.etat ? { etat: filtres.etat } : {},
    include: AVEC_SOURCES,
    orderBy: { creeLe: "desc" },
  });
}

export function listerSujetsActifs() {
  return prisma.veilleSujet.findMany({
    where: { etat: "actif" },
    include: AVEC_SOURCES,
  });
}

export function compterSujetsActifs() {
  return prisma.veilleSujet.count({ where: { etat: "actif" } });
}

export function obtenirSujet(id: string) {
  return prisma.veilleSujet.findUnique({ where: { id }, include: AVEC_SOURCES });
}

export function creerSujet(contrat: ContratChamps, creePar: string | null) {
  return prisma.veilleSujet.create({
    data: {
      nom: contrat.nom,
      description: contrat.description,
      objectif: contrat.objectif,
      moteurDialogue: contrat.moteurDialogue,
      moteurAnalyse: contrat.moteurAnalyse,
      evenementsRecherches: contrat.evenementsRecherches,
      criteresInclusion: contrat.criteresInclusion ?? undefined,
      criteresExclusion: contrat.criteresExclusion ?? undefined,
      zoneGeographique: contrat.zoneGeographique,
      categoriesSources: contrat.categoriesSources,
      informationsAExtraire: contrat.informationsAExtraire,
      creePar,
    },
    include: AVEC_SOURCES,
  });
}

export function mettreAJourContrat(id: string, contrat: ContratChamps) {
  return prisma.veilleSujet.update({
    where: { id },
    data: {
      nom: contrat.nom,
      description: contrat.description,
      objectif: contrat.objectif,
      moteurDialogue: contrat.moteurDialogue,
      moteurAnalyse: contrat.moteurAnalyse,
      evenementsRecherches: contrat.evenementsRecherches,
      criteresInclusion: contrat.criteresInclusion ?? undefined,
      criteresExclusion: contrat.criteresExclusion ?? undefined,
      zoneGeographique: contrat.zoneGeographique,
      categoriesSources: contrat.categoriesSources,
      informationsAExtraire: contrat.informationsAExtraire,
    },
    include: AVEC_SOURCES,
  });
}

export function changerEtat(id: string, etat: VeilleSujetEtat) {
  return prisma.veilleSujet.update({ where: { id }, data: { etat } });
}

// Suppression reelle : seulement appelee par core/veille/sujets.ts apres
// verification explicite de la confirmation utilisateur (aucune suppression
// sans accord, regle de gouvernance).
export function supprimerSujet(id: string) {
  return prisma.veilleSujet.delete({ where: { id } });
}

export function marquerTentative(id: string, at: Date) {
  return prisma.veilleSujet.update({ where: { id }, data: { derniereTentativeAt: at } });
}

export function marquerExecutionReussie(id: string, at: Date) {
  return prisma.veilleSujet.update({ where: { id }, data: { derniereExecutionReussieAt: at } });
}

export function marquerNouveaute(id: string, at: Date) {
  return prisma.veilleSujet.update({ where: { id }, data: { derniereNouveauteAt: at } });
}
