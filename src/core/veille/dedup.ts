// Cas d'usage - deduplication semantique (EXG-050..053). V1 : cle
// deterministe (cleDedup fournie par le moteur d'analyse) - si la cle
// correspond a un evenement existant, compare les donnees pour distinguer
// MODIFIE de CONNU ; sinon, nouvel evenement NOUVEAU. La comparaison IA
// (MoteurAnalyse.comparerObservation) reste disponible pour une evolution
// future (cas ambigus sans cle correspondante) mais n'est pas invoquee
// automatiquement dans cette V1, pour rester deterministe et econome en
// quota gratuit (EXG-001).

import * as evenementsData from "@/data/veille/evenements";
import * as observationsData from "@/data/veille/observations";
import * as sujetsData from "@/data/veille/sujets";
import type { Prisma } from "@prisma/client";
import type { VeilleEvenementStatut } from "@prisma/client";

export type ObservationExtraite = {
  titre?: string;
  resume?: string;
  cleDedup?: string;
  donnees?: Record<string, unknown>;
};

function normaliserCle(cle: string | undefined, titre: string | undefined): string {
  const base = (cle || titre || "").toLowerCase().trim().replace(/\s+/g, "_");
  return base || `evenement_${Date.now()}`;
}

function memesDonnees(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function classerObservation(params: {
  sujetId: string;
  observationId: string;
  observation: ObservationExtraite;
}): Promise<{ statut: VeilleEvenementStatut; evenementId: string }> {
  const cleDedup = normaliserCle(params.observation.cleDedup, params.observation.titre);
  const titre = params.observation.titre || cleDedup;
  const resume = (params.observation.resume || "").slice(0, 500);
  const donnees = (params.observation.donnees ?? {}) as Prisma.InputJsonValue;

  const existant = await evenementsData.trouverParCleDedup(params.sujetId, cleDedup);

  if (!existant) {
    const evenement = await evenementsData.creerEvenement({
      sujetId: params.sujetId,
      cleDedup,
      titre,
      resume,
      statut: "nouveau",
      donnees,
    });
    await observationsData.lierEvenement(params.observationId, evenement.id);
    await sujetsData.marquerNouveaute(params.sujetId, new Date());
    return { statut: "nouveau", evenementId: evenement.id };
  }

  await observationsData.lierEvenement(params.observationId, existant.id);

  if (memesDonnees(existant.donnees, donnees)) {
    await evenementsData.mettreAJourEvenement(existant.id, { statut: "connu", donnees: existant.donnees as Prisma.InputJsonValue });
    return { statut: "connu", evenementId: existant.id };
  }

  await evenementsData.creerVersion({
    evenementId: existant.id,
    donneesAvant: existant.donnees as Prisma.InputJsonValue,
    donneesApres: donnees,
  });
  await evenementsData.mettreAJourEvenement(existant.id, { statut: "modifie", titre, resume, donnees });
  await sujetsData.marquerNouveaute(params.sujetId, new Date());
  return { statut: "modifie", evenementId: existant.id };
}
