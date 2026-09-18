// Cas d'usage - etat lu/non lu d'un evenement (EXG-070..072). Une nouvelle
// execution de veille ne touche jamais ces champs (execution.ts/dedup.ts
// n'y accedent pas) : le statut NOUVEAU reste visible tant que l'evenement
// n'a pas ete ouvert.

import * as evenementsData from "@/data/veille/evenements";

export function marquerLu(id: string) {
  return evenementsData.marquerLu(id, true);
}

export function marquerNonLu(id: string) {
  return evenementsData.marquerLu(id, false);
}
