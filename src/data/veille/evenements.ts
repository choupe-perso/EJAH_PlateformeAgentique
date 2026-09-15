// Adaptateur de persistance - evenements de veille (VeilleEvenement,
// VeilleEvenementVersion) : faits consolides, avec leur historique de
// versions et leur tracabilite (observations -> collectes -> sources).

import { prisma } from "@/data/db";
import { Prisma } from "@prisma/client";
import type { VeilleEvenementStatut } from "@prisma/client";

export function trouverParCleDedup(sujetId: string, cleDedup: string) {
  return prisma.veilleEvenement.findUnique({
    where: { sujetId_cleDedup: { sujetId, cleDedup } },
  });
}

export function creerEvenement(params: {
  sujetId: string;
  cleDedup: string;
  titre: string;
  resume: string;
  statut: VeilleEvenementStatut;
  donnees: Prisma.InputJsonValue;
}) {
  const maintenant = new Date();
  return prisma.veilleEvenement.create({
    data: {
      sujetId: params.sujetId,
      cleDedup: params.cleDedup,
      titre: params.titre,
      resume: params.resume,
      statut: params.statut,
      donnees: params.donnees,
      premiereDetectionAt: maintenant,
      derniereDetectionAt: maintenant,
    },
  });
}

export function mettreAJourEvenement(
  id: string,
  params: { statut: VeilleEvenementStatut; titre?: string; resume?: string; donnees: Prisma.InputJsonValue }
) {
  return prisma.veilleEvenement.update({
    where: { id },
    data: {
      statut: params.statut,
      titre: params.titre,
      resume: params.resume,
      donnees: params.donnees,
      derniereDetectionAt: new Date(),
    },
  });
}

export function creerVersion(params: {
  evenementId: string;
  donneesAvant: Prisma.InputJsonValue | null;
  donneesApres: Prisma.InputJsonValue;
}) {
  return prisma.veilleEvenementVersion.create({
    data: {
      evenementId: params.evenementId,
      donneesAvant: params.donneesAvant ?? Prisma.JsonNull,
      donneesApres: params.donneesApres,
    },
  });
}

export function marquerLu(id: string, lu: boolean) {
  return prisma.veilleEvenement.update({
    where: { id },
    data: { lu, luAt: lu ? new Date() : null },
  });
}

const AVEC_SOURCES_ET_SUJET = {
  sujet: { select: { nom: true } },
  observations: {
    include: { collecte: { include: { source: true } } },
  },
};

function debutPeriode(periode: "aujourdhui" | "7j" | "30j" | "tout"): Date | null {
  const maintenant = new Date();
  if (periode === "aujourdhui") {
    return new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  }
  if (periode === "7j") return new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (periode === "30j") return new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
  return null;
}

export function listerEvenements(filtres: {
  sujetId?: string | null;
  periode?: "aujourdhui" | "7j" | "30j" | "tout";
  inclureConnu?: boolean;
  recherche?: string | null;
}) {
  const depuis = debutPeriode(filtres.periode ?? "tout");
  return prisma.veilleEvenement.findMany({
    where: {
      ...(filtres.sujetId ? { sujetId: filtres.sujetId } : {}),
      ...(depuis ? { derniereDetectionAt: { gte: depuis } } : {}),
      ...(filtres.inclureConnu ? {} : { statut: { in: ["nouveau", "modifie"] } }),
      ...(filtres.recherche
        ? {
            OR: [
              { titre: { contains: filtres.recherche, mode: "insensitive" as const } },
              { resume: { contains: filtres.recherche, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: AVEC_SOURCES_ET_SUJET,
    orderBy: { derniereDetectionAt: "desc" },
  });
}

export function compterNouveautes() {
  return prisma.veilleEvenement.count({ where: { statut: { in: ["nouveau", "modifie"] } } });
}

export function compterNonLus() {
  return prisma.veilleEvenement.count({ where: { lu: false, statut: { in: ["nouveau", "modifie"] } } });
}

export function obtenirTraceabilite(id: string) {
  return prisma.veilleEvenement.findUnique({
    where: { id },
    include: {
      sujet: { select: { nom: true } },
      versions: { orderBy: { detecteAt: "asc" } },
      observations: {
        include: { collecte: { include: { source: true } } },
        orderBy: { creeLe: "asc" },
      },
    },
  });
}
