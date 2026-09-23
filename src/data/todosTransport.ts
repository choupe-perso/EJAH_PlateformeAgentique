// Adaptateur de persistance pour l'agent Taches (table todos_transport).
// Aucune regle metier ici (validation, .ics...) - deleguee au coeur Python
// de l'agent (python/agents/taches/), appele par core/agents/taches.ts.

import { prisma } from "./db";
import type { TodoTransportStatut, TodoTransportType } from "@prisma/client";

export type NouvelleTacheRdv = {
  type: "rdv";
  titre: string;
  rdvDateDebut: Date;
  rdvDureeMinutes: number;
  rdvAlerteMinutes: number;
  rdvDescription?: string;
};

export type NouvelleTacheEmail = {
  type: "email";
  titre: string;
  emailDestinataire: string;
  emailNotesBrutes?: string;
  emailTexte: string;
};

export type NouvelleTachePrompt = {
  type: "prompt";
  titre: string;
  promptIa: string;
  promptProjet: string;
  promptNotesBrutes?: string;
  promptTexte: string;
};

export type NouvelleTache = NouvelleTacheRdv | NouvelleTacheEmail | NouvelleTachePrompt;

export function creerTache(tache: NouvelleTache) {
  const { type, titre, ...champsSpecifiques } = tache;
  return prisma.todoTransport.create({
    data: { type, titre, ...champsSpecifiques },
  });
}

export function listerTaches(filtres: {
  statut?: TodoTransportStatut | null;
  type?: TodoTransportType | null;
  titreRecherche?: string | null;
}) {
  return prisma.todoTransport.findMany({
    where: {
      ...(filtres.statut ? { statut: filtres.statut } : {}),
      ...(filtres.type ? { type: filtres.type } : {}),
      ...(filtres.titreRecherche
        ? { titre: { contains: filtres.titreRecherche, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { creeLe: "desc" },
  });
}

export function obtenirTache(id: string) {
  return prisma.todoTransport.findUnique({ where: { id } });
}

export async function marquerTraite(id: string): Promise<boolean> {
  try {
    await prisma.todoTransport.update({
      where: { id },
      data: { statut: "archivee", traiteLe: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}
