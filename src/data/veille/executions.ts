// Adaptateur de persistance - executions de veille (VeilleExecution,
// VeilleExecutionSujet).

import { prisma } from "@/data/db";
import type {
  VeilleExecutionType,
  VeilleDeclencheur,
  VeilleExecutionStatut,
} from "@prisma/client";

export function creerExecution(type: VeilleExecutionType, declencheur: VeilleDeclencheur) {
  return prisma.veilleExecution.create({ data: { type, declencheur, statut: "en_cours" } });
}

export function terminerExecution(id: string, statut: VeilleExecutionStatut) {
  return prisma.veilleExecution.update({
    where: { id },
    data: { statut, termineeAt: new Date() },
  });
}

export function creerExecutionSujet(params: {
  executionId: string;
  sujetId: string;
  fenetreDepuis: Date | null;
  fenetreJusqua: Date;
}) {
  return prisma.veilleExecutionSujet.create({
    data: {
      executionId: params.executionId,
      sujetId: params.sujetId,
      statut: "en_cours",
      fenetreDepuis: params.fenetreDepuis,
      fenetreJusqua: params.fenetreJusqua,
    },
  });
}

export function terminerExecutionSujet(
  id: string,
  params: { statut: VeilleExecutionStatut; erreur: string | null; nbNouveautes: number }
) {
  return prisma.veilleExecutionSujet.update({
    where: { id },
    data: { statut: params.statut, erreur: params.erreur, nbNouveautes: params.nbNouveautes },
  });
}

export function obtenirExecution(id: string) {
  return prisma.veilleExecution.findUnique({
    where: { id },
    include: { executionsSujet: { include: { sujet: true } } },
  });
}

export function derniereExecution() {
  return prisma.veilleExecution.findFirst({ orderBy: { demarreeAt: "desc" } });
}
