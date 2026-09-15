"use client";

import { useState } from "react";
import { TextArea } from "@/components/form/TextInput";
import { ActionButton } from "@/components/ActionButton";
import { SpinnerIcon } from "@/components/icons";
import { useChrono, formaterDuree } from "./useChrono";
import type { TourDialogue, MoteurId } from "@/shared/veille/moteur";
import type { ContratChamps } from "@/shared/veille/types";

export function DialogueThread({
  moteur,
  contratActuel,
  onBrouillonPret,
}: {
  moteur: MoteurId;
  contratActuel?: ContratChamps;
  onBrouillonPret: (brouillon: Partial<ContratChamps>) => void;
}) {
  const [historique, setHistorique] = useState<TourDialogue[]>([]);
  const [message, setMessage] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouvertureChatGpt, setOuvertureChatGpt] = useState(false);
  const secondesEcoulees = useChrono(chargement);

  async function seConnecterChatGpt() {
    setOuvertureChatGpt(true);
    try {
      await fetch("/api/veille/chatgpt-connexion", { method: "POST" });
    } finally {
      setOuvertureChatGpt(false);
    }
  }

  async function envoyer() {
    const texte = message.trim();
    if (!texte || chargement) return;
    setChargement(true);
    setErreur(null);
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
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--critical)] bg-[#FDECEB] px-3 py-2 text-xs text-[var(--critical)]">
          <span>{erreur}</span>
          {moteur === "chatgpt" && (
            <button
              type="button"
              onClick={seConnecterChatGpt}
              disabled={ouvertureChatGpt}
              className="rounded-[9px] bg-[var(--util-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--util-ink)]"
            >
              {ouvertureChatGpt ? "Ouverture…" : "Se connecter à ChatGPT"}
            </button>
          )}
        </div>
      )}

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
          {chargement ? `Envoi… (${formaterDuree(secondesEcoulees)})` : "Envoyer"}
        </ActionButton>
      </div>
    </div>
  );
}
