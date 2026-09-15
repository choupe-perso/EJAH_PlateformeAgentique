// Cas d'usage - dialogue de qualification d'un sujet de veille (EXG-010..013)
// et proposition de sources. Orchestre agents/veille/prompts.ts et
// core/veille/moteurs.ts - jamais d'appel direct a integrations/ depuis ici.

import { moteurDialogue } from "./moteurs";
import { CONTEXTE_QUALIFICATION, contexteModification, contextePropositionSources } from "@/agents/veille/prompts";
import type { MoteurId, MoteurResultat, TourDialogue } from "@/shared/veille/moteur";
import type { ContratChamps, SourceProposee } from "@/shared/veille/types";

function extraireJson<T>(texte: string): T | null {
  const debut = texte.indexOf("{");
  const brackDebut = texte.indexOf("[");
  const indexDebut = debut === -1 ? brackDebut : brackDebut === -1 ? debut : Math.min(debut, brackDebut);
  if (indexDebut === -1) return null;
  const fin = Math.max(texte.lastIndexOf("}"), texte.lastIndexOf("]"));
  if (fin === -1 || fin < indexDebut) return null;
  try {
    return JSON.parse(texte.slice(indexDebut, fin + 1)) as T;
  } catch {
    return null;
  }
}

type ReponseQualification = {
  message: string;
  pret: boolean;
  brouillon: Partial<ContratChamps> | null;
};

export type ResultatTourQualification = {
  message: string;
  historique: TourDialogue[];
  pret: boolean;
  brouillon: Partial<ContratChamps> | null;
};

export async function tourQualification(params: {
  moteurId: MoteurId;
  historique: TourDialogue[];
  messageUtilisateur: string;
  contratActuel?: ContratChamps;
}): Promise<MoteurResultat<ResultatTourQualification>> {
  const contexte = params.contratActuel ? contexteModification(params.contratActuel) : CONTEXTE_QUALIFICATION;

  const resultat = await moteurDialogue(params.moteurId).converser({
    contexte,
    historique: params.historique,
    messageUtilisateur: params.messageUtilisateur,
  });

  if (resultat.status === "indisponible") return resultat;

  const parsed = extraireJson<ReponseQualification>(resultat.valeur.reponse);
  const message = parsed?.message?.trim() || resultat.valeur.reponse.trim();
  const pret = parsed?.pret === true;
  const brouillon = pret ? parsed?.brouillon ?? null : null;

  const nouvelHistorique: TourDialogue[] = [
    ...params.historique,
    { role: "utilisateur", contenu: params.messageUtilisateur },
    { role: "assistant", contenu: message },
  ];

  return { status: "ok", valeur: { message, historique: nouvelHistorique, pret, brouillon } };
}

export async function proposerSources(
  moteurId: MoteurId,
  contrat: ContratChamps
): Promise<MoteurResultat<{ sources: SourceProposee[] }>> {
  const resultat = await moteurDialogue(moteurId).converser({
    contexte: contextePropositionSources(contrat),
    historique: [],
    messageUtilisateur: "Propose les sources maintenant.",
  });

  if (resultat.status === "indisponible") return resultat;

  const sources = extraireJson<SourceProposee[]>(resultat.valeur.reponse) ?? [];
  return { status: "ok", valeur: { sources: sources.filter((s) => s.categorie && s.libelle) } };
}
