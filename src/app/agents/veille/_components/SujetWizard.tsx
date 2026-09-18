"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SectionHead } from "@/components/SectionHead";
import { ActionButton } from "@/components/ActionButton";
import { SpinnerIcon } from "@/components/icons";
import { MoteurPicker } from "./MoteurPicker";
import { DialogueThread, type BrouillonAvecSources } from "./DialogueThread";
import { SourcesEditor } from "./SourcesEditor";
import { ContractSummary } from "./ContractSummary";
import { useChrono, formaterDuree } from "./useChrono";
import { normaliserBrouillon, reformulerContrat } from "@/core/veille/contrat";
import { MOTEURS_ANALYSE } from "@/shared/veille/types";
import type { VeilleMoteur, ContratChamps, SourceProposee, SujetDTO } from "@/shared/veille/types";

type Etape = "moteurDialogue" | "dialogue" | "sources" | "moteurAnalyse" | "resume";

export function SujetWizard({ sujetExistant }: { sujetExistant?: SujetDTO }) {
  const router = useRouter();
  const contratInitial: ContratChamps | null = sujetExistant
    ? {
        nom: sujetExistant.nom,
        description: sujetExistant.description,
        objectif: sujetExistant.objectif,
        moteurDialogue: sujetExistant.moteurDialogue,
        moteurAnalyse: sujetExistant.moteurAnalyse,
        evenementsRecherches: sujetExistant.evenementsRecherches,
        criteresInclusion: sujetExistant.criteresInclusion,
        criteresExclusion: sujetExistant.criteresExclusion,
        zoneGeographique: sujetExistant.zoneGeographique,
        categoriesSources: sujetExistant.categoriesSources,
        informationsAExtraire: sujetExistant.informationsAExtraire,
      }
    : null;

  const [etape, setEtape] = useState<Etape>(sujetExistant ? "resume" : "moteurDialogue");
  const [moteurDialogue, setMoteurDialogue] = useState<VeilleMoteur | null>(sujetExistant?.moteurDialogue ?? null);
  const [moteurAnalyse, setMoteurAnalyse] = useState<VeilleMoteur | null>(sujetExistant?.moteurAnalyse ?? null);
  const [brouillon, setBrouillon] = useState<Partial<ContratChamps> | null>(contratInitial);
  const [sources, setSources] = useState<SourceProposee[]>(
    sujetExistant?.sources.filter((s) => s.valide).map((s) => ({ categorie: s.categorie, libelle: s.libelle, url: s.url })) ?? []
  );
  const [chargementSources, setChargementSources] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargementValidation, setChargementValidation] = useState(false);
  const [erreursValidation, setErreursValidation] = useState<string[]>([]);
  const secondesSources = useChrono(chargementSources);

  async function demanderPropositionSources(contrat: ContratChamps) {
    setChargementSources(true);
    setErreur(null);
    try {
      const reponse = await fetch("/api/veille/sujets/sources-proposees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moteurId: contrat.moteurDialogue, contrat }),
      });
      const donnees = await reponse.json();
      if (!donnees.ok) {
        setErreur(donnees.raison || donnees.erreurs?.[0] || "Erreur inconnue.");
        setSources([]);
      } else {
        setSources(donnees.sources);
      }
    } catch {
      setErreur("Impossible de contacter le serveur.");
    } finally {
      setChargementSources(false);
    }
  }

  function onBrouillonPret(nouveauBrouillon: BrouillonAvecSources) {
    const { sources: sourcesExtraites, ...champsBrouillon } = nouveauBrouillon;
    const fusion = { ...brouillon, ...champsBrouillon };
    setBrouillon(fusion);
    setEtape("sources");
    if (sourcesExtraites && sourcesExtraites.length > 0) {
      // Le prompt de qualification riche liste deja des sources concretes
      // dans sa reponse (extraites par l'etape d'interpretation Ollama) -
      // on les reutilise directement plutot que de relancer un appel IA.
      setErreur(null);
      setSources(sourcesExtraites);
    } else {
      demanderPropositionSources(normaliserBrouillon(fusion, moteurDialogue!, moteurAnalyse ?? moteurDialogue!));
    }
  }

  function relancerRechercheSources() {
    demanderPropositionSources(normaliserBrouillon(brouillon ?? {}, moteurDialogue!, moteurAnalyse ?? moteurDialogue!));
  }

  function contratFinal(): ContratChamps {
    return normaliserBrouillon(brouillon ?? {}, moteurDialogue!, moteurAnalyse!);
  }

  async function valider() {
    setChargementValidation(true);
    setErreursValidation([]);
    const contrat = contratFinal();
    try {
      const url = sujetExistant ? `/api/veille/sujets/${sujetExistant.id}` : "/api/veille/sujets";
      const methode = sujetExistant ? "PATCH" : "POST";
      const reponse = await fetch(url, {
        method: methode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contrat, sources }),
      });
      const donnees = await reponse.json();
      if (!donnees.ok) {
        setErreursValidation(donnees.erreurs ?? ["Erreur inconnue."]);
        return;
      }
      // ?cree=1 uniquement lors d'une creation (pas d'une modification) :
      // la page de destination reutilise ce meme composant en etape
      // "resume", visuellement identique a l'ecran qu'on vient de quitter -
      // sans ce marqueur, valider un nouveau sujet donne l'impression que
      // "rien ne se passe" (constate a l'usage).
      const suffixe = sujetExistant ? "" : "?cree=1";
      router.push(`/agents/veille/sujets/${donnees.sujet.id}${suffixe}`);
      router.refresh();
    } catch {
      setErreursValidation(["Impossible de contacter le serveur."]);
    } finally {
      setChargementValidation(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {etape === "moteurDialogue" && (
        <section>
          <SectionHead eyebrow="Étape 1/5" title="Moteur de dialogue" />
          <p className="mb-3 text-xs text-[var(--ink-soft)]">
            Choisis le moteur qui va t'aider à préciser ton besoin de veille (EXG-011).
          </p>
          <MoteurPicker valeur={moteurDialogue} onChange={setMoteurDialogue} />
          <div className="mt-4">
            <ActionButton disabled={!moteurDialogue} onClick={() => setEtape("dialogue")}>
              Continuer
            </ActionButton>
          </div>
        </section>
      )}

      {etape === "dialogue" && moteurDialogue && (
        <section>
          <SectionHead eyebrow="Étape 2/5" title="Qualification du besoin" />
          <DialogueThread moteur={moteurDialogue} contratActuel={contratInitial ?? undefined} onBrouillonPret={onBrouillonPret} />
        </section>
      )}

      {etape === "sources" && (
        <section>
          <SectionHead eyebrow="Étape 3/5" title="Sources proposées" />
          {chargementSources && (
            <div className="mb-3">
              <ActionButton variant="loading" icon={<SpinnerIcon />} disabled>
                {`Recherche de sources… (${formaterDuree(secondesSources)})`}
              </ActionButton>
            </div>
          )}
          {erreur && (
            <p className="mb-2 rounded-lg border border-[var(--critical)] bg-[#FDECEB] px-3 py-2 text-xs text-[var(--critical)]">
              {erreur}
            </p>
          )}
          {!chargementSources && (
            <>
              <SourcesEditor sources={sources} onChange={setSources} />
              <div className="mt-3">
                <ActionButton variant="ghost" onClick={relancerRechercheSources}>
                  Relancer la recherche IA
                </ActionButton>
              </div>
            </>
          )}
          <div className="mt-4">
            <ActionButton disabled={chargementSources} onClick={() => setEtape("moteurAnalyse")}>
              Continuer
            </ActionButton>
          </div>
        </section>
      )}

      {etape === "moteurAnalyse" && (
        <section>
          <SectionHead eyebrow="Étape 4/5" title="Moteur d'analyse" />
          <p className="mb-3 text-xs text-[var(--ink-soft)]">
            Choisi séparément du moteur de dialogue (EXG-015) - c'est lui qui analysera les collectes lors de chaque veille.
          </p>
          <MoteurPicker valeur={moteurAnalyse} onChange={setMoteurAnalyse} options={MOTEURS_ANALYSE} />
          <div className="mt-4">
            <ActionButton disabled={!moteurAnalyse} onClick={() => setEtape("resume")}>
              Continuer
            </ActionButton>
          </div>
        </section>
      )}

      {etape === "resume" && (moteurDialogue || sujetExistant) && (moteurAnalyse || sujetExistant) && (
        <section>
          <SectionHead eyebrow="Étape 5/5" title="Validation du contrat" />
          <ContractSummary
            texte={reformulerContrat(contratFinal(), sources)}
            erreurs={erreursValidation}
            chargement={chargementValidation}
            onValider={valider}
            onModifier={() => setEtape("moteurDialogue")}
            onContinuerDiscussion={() => setEtape("dialogue")}
            onAnnuler={() => router.push("/agents/veille/sujets")}
          />
        </section>
      )}
    </div>
  );
}
