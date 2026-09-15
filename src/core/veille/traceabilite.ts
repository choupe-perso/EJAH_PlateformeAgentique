// Cas d'usage - tracabilite d'un evenement (section 16) : evenement <-
// observations <- collectes <- sources, + historique de versions (EXG-084).

import * as evenementsData from "@/data/veille/evenements";
import type { TraceabiliteDTO } from "@/shared/veille/types";

export async function getTraceabilite(evenementId: string): Promise<TraceabiliteDTO | null> {
  const e = await evenementsData.obtenirTraceabilite(evenementId);
  if (!e) return null;

  const sourcesUniques = new Map<string, { id: string; libelle: string; url: string | null }>();
  for (const obs of e.observations) {
    const s = obs.collecte.source;
    sourcesUniques.set(s.id, { id: s.id, libelle: s.libelle, url: s.url });
  }

  return {
    evenement: {
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
    },
    versions: e.versions.map((v) => ({
      id: v.id,
      donneesAvant: (v.donneesAvant as Record<string, unknown> | null) ?? null,
      donneesApres: (v.donneesApres as Record<string, unknown>) ?? {},
      detecteAt: v.detecteAt.toISOString(),
    })),
    observations: e.observations.map((o) => ({
      id: o.id,
      donneesExtraites: (o.donneesExtraites as Record<string, unknown>) ?? {},
      creeLe: o.creeLe.toISOString(),
      collecte: {
        id: o.collecte.id,
        recupereAt: o.collecte.recupereAt.toISOString(),
        source: { id: o.collecte.source.id, libelle: o.collecte.source.libelle, url: o.collecte.source.url },
      },
    })),
  };
}
