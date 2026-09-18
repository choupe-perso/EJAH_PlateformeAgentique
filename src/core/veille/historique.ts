// Cas d'usage - historique et cartes d'information du Centre de veille
// (EXG-060/061, section 15). CONNU exclu par defaut (inclureConnu=false),
// conserve en base pour la deduplication (EXG-083).

import * as evenementsData from "@/data/veille/evenements";
import type { EvenementDTO, PeriodeHistorique } from "@/shared/veille/types";

type EvenementAvecRelations = Awaited<ReturnType<typeof evenementsData.listerEvenements>>[number];

function mapEvenement(e: EvenementAvecRelations): EvenementDTO {
  const sourcesUniques = new Map<string, { id: string; libelle: string; url: string | null }>();
  for (const obs of e.observations) {
    const s = obs.collecte.source;
    sourcesUniques.set(s.id, { id: s.id, libelle: s.libelle, url: s.url });
  }
  return {
    id: e.id,
    sujetId: e.sujetId,
    sujetNom: e.sujet.nom,
    statut: e.statut,
    titre: e.titre,
    resume: e.resume,
    donnees: (e.donnees as Record<string, unknown>) ?? {},
    sources: Array.from(sourcesUniques.values()),
    premiereDetectionAt: e.premiereDetectionAt.toISOString(),
    derniereDetectionAt: e.derniereDetectionAt.toISOString(),
    lu: e.lu,
  };
}

export async function listerEvenements(filtres: {
  sujetId?: string | null;
  periode?: PeriodeHistorique;
  inclureConnu?: boolean;
  recherche?: string | null;
}): Promise<EvenementDTO[]> {
  const evenements = await evenementsData.listerEvenements(filtres);
  return evenements.map(mapEvenement);
}
