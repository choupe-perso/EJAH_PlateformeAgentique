// Cas d'usage - dialogue de qualification d'un sujet de veille (EXG-010..013)
// et proposition de sources. Orchestre agents/veille/prompts.ts et
// core/veille/moteurs.ts - jamais d'appel direct a integrations/ depuis ici.

import { appelOllama, OllamaError } from "@/integrations/ollama/client";
import { moteurDialogue } from "./moteurs";
import {
  contexteQualification,
  contexteModification,
  contextePropositionSources,
  contexteInterpretationQualification,
  contexteInterpretationSources,
} from "@/agents/veille/prompts";
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

// Le brouillon peut porter des sources deja extraites de la reponse
// qualifiee (voir contexteInterpretationQualification) - ContratChamps
// lui-meme n'a pas de champ "sources" (ce n'est le cas que de
// ContratBrouillon), d'ou l'intersection explicite ici.
type BrouillonAvecSources = Partial<ContratChamps> & { sources?: SourceProposee[] };

type ReponseQualification = {
  message: string;
  pret: boolean;
  brouillon: BrouillonAvecSources | null;
};

export type ResultatTourQualification = {
  message: string;
  historique: TourDialogue[];
  pret: boolean;
  brouillon: BrouillonAvecSources | null;
};

// Extrait le sujet a surveiller (premier message utilisateur de la
// conversation) a partir de l'historique deja accumule, ou du message en
// cours si la conversation demarre tout juste - utilise pour substituer
// $sujet$ dans le prompt de qualification.
function extraireSujet(historique: TourDialogue[], messageUtilisateur: string): string {
  const premierMessage = historique.find((tour) => tour.role === "utilisateur");
  return premierMessage?.contenu.trim() || messageUtilisateur.trim();
}

// "Response Interpreter" (EXG du document EJAH_Specification_IA_Web_Pilotage_Silencieux_V1) :
// traduit la reponse en langage naturel d'un moteur de dialogue (Ollama,
// Gemini ou ChatGPT Web) dans le protocole JSON interne attendu. Cet appel
// passe TOUJOURS par Ollama (appelOllama), quel que soit le moteur de
// dialogue choisi par l'utilisateur - c'est le seul point de ce fichier ou
// un appel a integrations/ est fait directement, car cette etape est une
// mise en forme locale et non une decision de qualification.
async function interpreterReponse(reponseBrute: string): Promise<MoteurResultat<ReponseQualification>> {
  let texteInterprete: string;
  try {
    // leger:true - tache mecanique de mise en forme, pas de raisonnement
    // necessaire (voir integrations/ollama/client.ts).
    texteInterprete = await appelOllama(contexteInterpretationQualification(reponseBrute), { leger: true });
  } catch (erreur) {
    if (erreur instanceof OllamaError) {
      return {
        status: "indisponible",
        raison: `Interpretation Ollama indisponible - ${erreur.message}`,
      };
    }
    throw erreur;
  }

  const parsed = extraireJson<ReponseQualification>(texteInterprete);
  if (!parsed) {
    return { status: "ok", valeur: { message: reponseBrute.trim(), pret: false, brouillon: null } };
  }
  return {
    status: "ok",
    valeur: {
      message: parsed.message?.trim() || reponseBrute.trim(),
      pret: parsed.pret === true,
      brouillon: parsed.pret === true ? parsed.brouillon ?? null : null,
    },
  };
}

export async function tourQualification(params: {
  moteurId: MoteurId;
  historique: TourDialogue[];
  messageUtilisateur: string;
  contratActuel?: ContratChamps;
}): Promise<MoteurResultat<ResultatTourQualification>> {
  const sujet = extraireSujet(params.historique, params.messageUtilisateur);
  const contexte = params.contratActuel
    ? contexteModification(params.contratActuel, sujet)
    : contexteQualification(sujet);

  const resultat = await moteurDialogue(params.moteurId).converser({
    contexte,
    historique: params.historique,
    messageUtilisateur: params.messageUtilisateur,
  });

  if (resultat.status === "indisponible") return resultat;

  const interprete = await interpreterReponse(resultat.valeur.reponse);
  if (interprete.status === "indisponible") return interprete;

  const { message, pret, brouillon } = interprete.valeur;

  const nouvelHistorique: TourDialogue[] = [
    ...params.historique,
    { role: "utilisateur", contenu: params.messageUtilisateur },
    { role: "assistant", contenu: message },
  ];

  return { status: "ok", valeur: { message, historique: nouvelHistorique, pret, brouillon } };
}

// Mode manuel "hors IA" pour ChatGPT (EXG-005 : jamais d'automatisation de
// connexion/pilotage du site) : l'utilisateur copie ce prompt et l'envoie
// lui-meme sur chatgpt.com, echange librement la-bas, puis colle la reponse
// finale dans EJAH. Seule la mise en forme (interpretation) reste assistee.
export function construirePromptManuel(sujet: string, contratActuel?: ContratChamps): string {
  return contratActuel ? contexteModification(contratActuel, sujet) : contexteQualification(sujet);
}

// Traite une reponse collee manuellement (ChatGPT ou tout autre outil hors
// IA) - aucun appel a un MoteurDialogue ici, uniquement l'etape
// d'interpretation Ollama, partagee avec le flux automatise.
export async function tourQualificationManuel(params: {
  historique: TourDialogue[];
  reponseBrute: string;
}): Promise<MoteurResultat<ResultatTourQualification>> {
  const interprete = await interpreterReponse(params.reponseBrute);
  if (interprete.status === "indisponible") return interprete;

  const { message, pret, brouillon } = interprete.valeur;
  const nouvelHistorique: TourDialogue[] = [...params.historique, { role: "assistant", contenu: message }];

  return { status: "ok", valeur: { message, historique: nouvelHistorique, pret, brouillon } };
}

export async function proposerSources(
  moteurId: MoteurId,
  contrat: ContratChamps
): Promise<MoteurResultat<{ sources: SourceProposee[] }>> {
  if (moteurId === "chatgpt") {
    return {
      status: "indisponible",
      raison:
        "ChatGPT (manuel) ne propose pas de sources automatiquement - ajoute-les toi-meme ci-dessous, ou reprends-les depuis la reponse collee si elle en listait deja.",
    };
  }

  const resultat = await moteurDialogue(moteurId).converser({
    contexte: contextePropositionSources(contrat),
    historique: [],
    messageUtilisateur: "Propose les sources maintenant.",
  });

  if (resultat.status === "indisponible") return resultat;

  let texteInterprete: string;
  try {
    texteInterprete = await appelOllama(contexteInterpretationSources(resultat.valeur.reponse), { leger: true });
  } catch (erreur) {
    if (erreur instanceof OllamaError) {
      return {
        status: "indisponible",
        raison: `Interpretation Ollama indisponible - ${erreur.message}`,
      };
    }
    throw erreur;
  }

  const sources = extraireJson<SourceProposee[]>(texteInterprete) ?? [];
  return { status: "ok", valeur: { sources: sources.filter((s) => s.categorie && s.libelle) } };
}
