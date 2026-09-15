// Adaptateur de persistance - sources de veille (modele VeilleSource).
// remplacerSources ne supprime jamais une source qui a deja de l'historique
// de collecte (contrainte FK depuis VeilleCollecte) : une source retiree
// lors d'une modification est desactivee (valide=false), pas supprimee.

import { prisma } from "@/data/db";
import type { SourceProposee } from "@/shared/veille/types";
import type { VeilleSourceOrigine } from "@prisma/client";

export function listerSourcesValidees(sujetId: string) {
  return prisma.veilleSource.findMany({ where: { sujetId, valide: true } });
}

export async function remplacerSources(
  sujetId: string,
  sources: Array<SourceProposee & { proposePar: VeilleSourceOrigine }>
): Promise<void> {
  await prisma.veilleSource.updateMany({ where: { sujetId }, data: { valide: false } });

  const existantes = await prisma.veilleSource.findMany({ where: { sujetId } });

  for (const source of sources) {
    const correspondance = existantes.find(
      (e) => e.categorie === source.categorie && e.libelle.toLowerCase() === source.libelle.toLowerCase()
    );
    if (correspondance) {
      await prisma.veilleSource.update({
        where: { id: correspondance.id },
        data: { url: source.url, valide: true },
      });
    } else {
      await prisma.veilleSource.create({
        data: {
          sujetId,
          categorie: source.categorie,
          libelle: source.libelle,
          url: source.url,
          proposePar: source.proposePar,
          valide: true,
        },
      });
    }
  }
}
