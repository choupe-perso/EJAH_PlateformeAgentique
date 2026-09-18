// Cas d'usage - execution de la veille (collecte -> observation ->
// evenement). Fonction UNIQUE partagee par le bouton manuel, le bouton
// individuel et la route externe (aucune logique dupliquee).

import * as sujetsData from "@/data/veille/sujets";
import * as sourcesData from "@/data/veille/sources";
import * as executionsData from "@/data/veille/executions";
import * as collectesData from "@/data/veille/collectes";
import * as observationsData from "@/data/veille/observations";
import { moteurAnalyse } from "./moteurs";
import { classerObservation, type ObservationExtraite } from "./dedup";
import { contexteExtraction as construireContexteExtraction } from "@/agents/veille/prompts";
import { recupererContenuUrl } from "@/integrations/web/fetchContenu";
import * as sujetsUseCases from "./sujets";
import type { Prisma, VeilleExecutionStatut, VeilleDeclencheur } from "@prisma/client";
import type { ExecutionResultatDTO, ExecutionSujetResultatDTO } from "@/shared/veille/types";

async function executerUnSujet(sujetId: string, executionId: string): Promise<ExecutionSujetResultatDTO> {
  const maintenant = new Date();
  const sujet = await sujetsUseCases.obtenirSujet(sujetId);
  if (!sujet) {
    return { sujetId, sujetNom: "(sujet introuvable)", statut: "echoue", erreur: "Sujet introuvable.", nbNouveautes: 0 };
  }

  await sujetsData.marquerTentative(sujetId, maintenant);

  const fenetreDepuis = sujet.derniereExecutionReussieAt ? new Date(sujet.derniereExecutionReussieAt) : null;
  const executionSujet = await executionsData.creerExecutionSujet({
    executionId,
    sujetId,
    fenetreDepuis,
    fenetreJusqua: maintenant,
  });

  const sourcesValidees = await sourcesData.listerSourcesValidees(sujetId);

  if (sourcesValidees.length === 0) {
    await executionsData.terminerExecutionSujet(executionSujet.id, { statut: "reussi", erreur: null, nbNouveautes: 0 });
    await sujetsData.marquerExecutionReussie(sujetId, maintenant);
    return { sujetId, sujetNom: sujet.nom, statut: "reussi", erreur: null, nbNouveautes: 0 };
  }

  const contexteExtraction = construireContexteExtraction(sujet);
  let nbCollectesOk = 0;
  let nbNouveautes = 0;
  let raisonIndisponible: string | null = null;

  for (const source of sourcesValidees) {
    const contenuResult = source.url
      ? await recupererContenuUrl(source.url)
      : ({ ok: false, erreur: "Pas d'URL renseignée pour cette source (collecte manuelle uniquement en V1)." } as const);

    const collecte = await collectesData.creerCollecte({
      executionSujetId: executionSujet.id,
      sourceId: source.id,
      contenuBrut: contenuResult.ok ? contenuResult.contenu : null,
      statut: contenuResult.ok ? "ok" : "echec",
      erreur: contenuResult.ok ? null : contenuResult.erreur,
    });

    if (!contenuResult.ok) continue;
    nbCollectesOk++;

    const extraction = await moteurAnalyse(sujet.moteurAnalyse).extraireObservations({
      contexte: contexteExtraction,
      contenu: contenuResult.contenu,
    });

    if (extraction.status === "indisponible") {
      raisonIndisponible = extraction.raison;
      continue;
    }

    for (const obsBrute of extraction.valeur.observations as ObservationExtraite[]) {
      const observation = await observationsData.creerObservation({
        collecteId: collecte.id,
        donneesExtraites: (obsBrute ?? {}) as Prisma.InputJsonValue,
        pertinente: true,
      });
      const classement = await classerObservation({ sujetId, observationId: observation.id, observation: obsBrute });
      if (classement.statut === "nouveau" || classement.statut === "modifie") nbNouveautes++;
    }
  }

  let statutFinal: VeilleExecutionStatut;
  let erreurFinale: string | null = null;
  if (nbCollectesOk === 0) {
    statutFinal = "echoue";
    erreurFinale = raisonIndisponible ?? "Toutes les sources ont échoué pour ce sujet.";
  } else if (raisonIndisponible || nbCollectesOk < sourcesValidees.length) {
    statutFinal = "partiel";
    erreurFinale = raisonIndisponible ?? "Une ou plusieurs sources ont échoué.";
  } else {
    statutFinal = "reussi";
  }

  await executionsData.terminerExecutionSujet(executionSujet.id, {
    statut: statutFinal,
    erreur: erreurFinale,
    nbNouveautes,
  });

  // EXG-040/041 : seule une execution REUSSIE (pas "partielle") avance la
  // borne, pour ne jamais risquer un trou de collecte sur la source qui a
  // echoue - le prochain run reprendra depuis le meme point pour toutes les
  // sources, la deduplication evite de re-signaler ce qui est deja CONNU.
  if (statutFinal === "reussi") {
    await sujetsData.marquerExecutionReussie(sujetId, maintenant);
  }

  return { sujetId, sujetNom: sujet.nom, statut: statutFinal, erreur: erreurFinale, nbNouveautes };
}

export async function runSujet(sujetId: string, declencheur: VeilleDeclencheur): Promise<ExecutionResultatDTO> {
  const execution = await executionsData.creerExecution("individuelle", declencheur);
  const resultat = await executerUnSujet(sujetId, execution.id);
  await executionsData.terminerExecution(execution.id, resultat.statut);

  return {
    id: execution.id,
    type: "individuelle",
    declencheur,
    statut: resultat.statut,
    demarreeAt: execution.demarreeAt.toISOString(),
    termineeAt: new Date().toISOString(),
    sujets: [resultat],
  };
}

export async function runGlobal(declencheur: VeilleDeclencheur): Promise<ExecutionResultatDTO> {
  const execution = await executionsData.creerExecution("globale", declencheur);
  const sujetsActifs = await sujetsData.listerSujetsActifs();

  const resultats: ExecutionSujetResultatDTO[] = [];
  for (const sujet of sujetsActifs) {
    // Sequentiel (pas Promise.all) : une session Ollama/ChatGPT locale ne
    // supporte pas des appels concurrents fiables, et ca reste econome en
    // quota Gemini gratuit.
    resultats.push(await executerUnSujet(sujet.id, execution.id));
  }

  const statutGlobal: VeilleExecutionStatut =
    resultats.length === 0
      ? "reussi"
      : resultats.every((r) => r.statut === "reussi")
        ? "reussi"
        : resultats.every((r) => r.statut === "echoue")
          ? "echoue"
          : "partiel";

  await executionsData.terminerExecution(execution.id, statutGlobal);

  return {
    id: execution.id,
    type: "globale",
    declencheur,
    statut: statutGlobal,
    demarreeAt: execution.demarreeAt.toISOString(),
    termineeAt: new Date().toISOString(),
    sujets: resultats,
  };
}
