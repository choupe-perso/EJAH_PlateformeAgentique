// Adaptateur de persistance - collectes (VeilleCollecte) : contenu brut
// recupere depuis une source lors d'une execution.

import { prisma } from "@/data/db";
import type { VeilleCollecteStatut } from "@prisma/client";

export function creerCollecte(params: {
  executionSujetId: string;
  sourceId: string;
  contenuBrut: string | null;
  statut: VeilleCollecteStatut;
  erreur: string | null;
}) {
  return prisma.veilleCollecte.create({
    data: {
      executionSujetId: params.executionSujetId,
      sourceId: params.sourceId,
      contenuBrut: params.contenuBrut,
      statut: params.statut,
      erreur: params.erreur,
    },
  });
}

export function listerCollectesParExecutionSujet(executionSujetId: string) {
  return prisma.veilleCollecte.findMany({
    where: { executionSujetId },
    include: { source: true },
  });
}
