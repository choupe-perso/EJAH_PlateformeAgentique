// Adaptateur de persistance pour l'historique des actions (voir prisma/schema.prisma).

import { prisma } from "./db";

export function enregistrerHistorique(params: {
  universe: "cockpit" | "agents";
  actionType: string;
  description: string;
  payload?: object;
}) {
  return prisma.actionHistory.create({
    data: {
      universe: params.universe,
      actionType: params.actionType,
      description: params.description,
      payload: params.payload,
    },
  });
}
