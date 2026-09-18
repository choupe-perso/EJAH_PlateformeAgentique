// Cas d'usage - synthese du Centre de veille (EXG-060).

import * as sujetsData from "@/data/veille/sujets";
import * as evenementsData from "@/data/veille/evenements";
import * as executionsData from "@/data/veille/executions";
import type { SyntheseVeille } from "@/shared/veille/types";

export async function getSynthese(): Promise<SyntheseVeille> {
  const [sujetsActifs, nouveautes, nonLus, execution] = await Promise.all([
    sujetsData.compterSujetsActifs(),
    evenementsData.compterNouveautes(),
    evenementsData.compterNonLus(),
    executionsData.derniereExecution(),
  ]);

  return {
    sujetsActifs,
    nouveautes,
    nonLus,
    derniereExecution: execution
      ? {
          demarreeAt: execution.demarreeAt.toISOString(),
          termineeAt: execution.termineeAt ? execution.termineeAt.toISOString() : null,
          statut: execution.statut,
        }
      : null,
  };
}
