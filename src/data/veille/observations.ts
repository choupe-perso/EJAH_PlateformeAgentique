// Adaptateur de persistance - observations (VeilleObservation) : information
// extraite d'une collecte, candidate a correspondre au contrat du sujet.

import { prisma } from "@/data/db";
import type { Prisma } from "@prisma/client";

export function creerObservation(params: {
  collecteId: string;
  donneesExtraites: Prisma.InputJsonValue;
  pertinente: boolean;
}) {
  return prisma.veilleObservation.create({
    data: {
      collecteId: params.collecteId,
      donneesExtraites: params.donneesExtraites,
      pertinente: params.pertinente,
    },
  });
}

export function lierEvenement(observationId: string, evenementId: string) {
  return prisma.veilleObservation.update({
    where: { id: observationId },
    data: { evenementId },
  });
}
