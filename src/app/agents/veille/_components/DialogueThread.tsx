"use client";

import { useState } from "react";
import { TextArea } from "@/components/form/TextInput";
import { ActionButton } from "@/components/ActionButton";
import { SpinnerIcon, CheckIcon, CopyIcon } from "@/components/icons";
import { useChrono, formaterDuree } from "./useChrono";
import type { TourDialogue, MoteurId } from "@/shared/veille/moteur";
import type { ContratChamps, SourceProposee } from "@/shared/veille/types";

// Le brouillon "pret" peut porter des sources deja extraites de la reponse
// de qualification (prompt riche) - voir contexteInterpretationQualification.
export type BrouillonAvecSources = Partial<ContratChamps> & { sources?: SourceProposee[] };

function BlocPromptACopier({ prompt }: { prompt: string }) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    } catch {
      // Presse-papiers indisponible - ignore silencieusement, le texte reste lisible.
    }
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--ink-soft)]">Prompt à coller dans ChatGPT</span>
        <button
          type="button"
          onClick={copier}
          aria-label="Copier le prompt"
          className="flex items-center gap-1 rounded-[9px] bg-[var(--util-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--util-ink)]"
        >
          {copie ? <CheckIcon /> : <CopyIcon />}
          {copie ? "Copié" : "Copier"}
        </button>
      </div>
      <pre className="max-h-[180px] overflow-y-auto whitespace-pre-wrap font-[var(--font-ibm-plex-mono)] text-[11px] leading-relaxed text-[var(--ink)]">
        {prompt}
      </pre>
    </div>
  );
}

export function DialogueThread({
  moteur,
  contratActuel,
  onBrouillonPret,
}: {
  moteur: MoteurId;
  contratActuel?: ContratChamps;
  onBrouillonPret: (brouillon: BrouillonAvecSources) => void;
}) {
  const [historique, setHistorique] = useState<TourDialogue[]>([]);
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const secondesEcoulees = useChrono(chargement);

  // Mode manuel (moteur === "chatgpt", EXG-005 : hors IA, aucune
  // automatisation de connexion/pilotage du site) - EJAH fournit le prompt
  // de depart, l'utilisateur echange librement sur chatgpt.com puis colle
  // la reponse finale ici pour interpretation.
  const [promptACopier, setPromptACopier] = useState<string | null>(null);
  const [reponseCollee, setReponseCollee] = useState("");

  async function envoyer() {
    const texte = message.trim();
    if (!texte || chargement) return;
    setChargement(true);
    setErreur(null);

    if (moteur === "chatgpt") {
      try {
        const reponse = await fetch("/api/veille/sujets/prompt-manuel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sujet: texte, contratActuel }),
        });
        const donnees = await reponse.json();
        if (!donnees.ok) {
          setErreur(donnees.erreurs?.[0] ?? "Erreur inconnue.");
          return;
        }
        setPromptACopier(donnees.prompt);
        setHistorique((h) => [...h, { role: "utilisateur", contenu: texte }]);
        setMessage("");
      } catch {
        setErreur("Impossible de contacter le serveur.");
      } finally {
        setChargement(false);
      }
      return;
    }

    try {
      const reponse = await fetch("/api/veille/sujets/dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moteurId: moteur, historique, messageUtilisateur: texte, contratActuel }),
      });
      const donnees = await reponse.json();
      if (!donnees.ok) {
        setErreur(donnees.raison || donnees.erreurs?.[0] || "Erreur inconnue.");
        return;
      }
      setHistorique(donnees.historique);
      setMessage("");
      if (donnees.pret) {
        onBrouillonPret(donnees.brouillon ?? {});
      }
    } catch {
      setErreur("Impossible de contacter le serveur.");
    } finally {
      setChargement(false);
    }
  }

  async function interpreterReponseCollee() {
    const texte = reponseCollee.trim();
    if (!texte || chargement) return;
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await fetch("/api/veille/sujets/dialogue-manuel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historique, reponseBrute: texte }),
      });
      const donnees = await reponse.json();
      if (!donnees.ok) {
        setErreur(donnees.raison || donnees.erreurs?.[0] || "Erreur inconnue.");
        return;
      }
      setHistorique(donnees.historique);
      setReponseCollee("");
      if (donnees.pret) {
        onBrouillonPret(donnees.brouillon ?? {});
      }
    } catch {
      setErreur("Impossible de contacter le serveur.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-3">
        {historique.length === 0 && (
          <p className="text-xs text-[var(--ink-soft)]">
            Décris ce que tu veux surveiller (ex : « Je veux surveiller les promotions sur les XREAL Pro »).
          </p>
        )}
        {historique.map((tour, i) => (
          <div
            key={i}
            className={
              "max-w-[85%] rounded-xl px-3 py-2 text-[13px] " +
              (tour.role === "utilisateur"
                ? "self-end bg-[var(--orange)] text-white"
                : "self-start bg-white text-[var(--ink)]")
            }
          >
            {tour.contenu}
          </div>
        ))}
      </div>

      {erreur && (
        <p className="rounded-lg border border-[var(--critical)] bg-[#FDECEB] px-3 py-2 text-xs text-[var(--critical)]">
          {erreur}
        </p>
      )}

      {moteur === "chatgpt" && promptACopier && (
        <>
          <BlocPromptACopier prompt={promptACopier} />
          <p className="text-[11px] text-[var(--ink-soft)]">
            Échange librement avec ChatGPT jusqu&apos;à obtenir la proposition finale de contrat, puis colle-la ci-dessous.
          </p>
          <TextArea
            rows={4}
            value={reponseCollee}
            onChange={(e) => setReponseCollee(e.target.value)}
            placeholder="Colle ici la réponse de ChatGPT…"
          />
          <ActionButton
            variant={chargement ? "loading" : "primary"}
            icon={chargement ? <SpinnerIcon /> : undefined}
            onClick={interpreterReponseCollee}
            disabled={chargement || reponseCollee.trim() === ""}
          >
            {chargement ? `Interprétation… (${formaterDuree(secondesEcoulees)})` : "Interpréter la réponse collée"}
          </ActionButton>
        </>
      )}

      {!(moteur === "chatgpt" && promptACopier) && (
        <div className="flex gap-2">
          <TextArea
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ton message…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                envoyer();
              }
            }}
          />
          <ActionButton
            variant={chargement ? "loading" : "primary"}
            icon={chargement ? <SpinnerIcon /> : undefined}
            onClick={envoyer}
            disabled={chargement}
          >
            {chargement
              ? `${moteur === "chatgpt" ? "Préparation" : "Envoi"}… (${formaterDuree(secondesEcoulees)})`
              : moteur === "chatgpt"
                ? "Préparer le prompt"
                : "Envoyer"}
          </ActionButton>
        </div>
      )}
    </div>
  );
}
