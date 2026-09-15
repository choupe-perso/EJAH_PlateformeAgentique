"use client";

import { useState } from "react";
import { LIBELLE_MOTEUR, MOTEURS } from "@/shared/veille/types";
import type { VeilleMoteur } from "@/shared/veille/types";

export function MoteurPicker({
  valeur,
  onChange,
}: {
  valeur: VeilleMoteur | null;
  onChange: (moteur: VeilleMoteur) => void;
}) {
  const [ouverture, setOuverture] = useState<"idle" | "ouverture" | "ouvert">("idle");

  async function ouvrirConnexionChatGpt() {
    setOuverture("ouverture");
    try {
      await fetch("/api/veille/chatgpt-connexion", { method: "POST" });
      setOuverture("ouvert");
    } catch {
      setOuverture("idle");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-[9px]">
        {MOTEURS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={
              "rounded-full border-[1.5px] px-[15px] py-[6.5px] text-[12.5px] font-semibold " +
              (valeur === m
                ? "border-[var(--orange)] bg-[var(--orange)] text-white"
                : "border-[var(--line)] bg-white text-[#5C4F49]")
            }
          >
            {LIBELLE_MOTEUR[m]}
          </button>
        ))}
      </div>
      {valeur === "chatgpt" && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={ouvrirConnexionChatGpt}
            className="rounded-[9px] bg-[var(--util-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--util-ink)]"
          >
            Se connecter à ChatGPT
          </button>
          {ouverture === "ouvert" && (
            <span className="text-[11px] text-[var(--ink-soft)]">
              Fenêtre ouverte - connecte-toi manuellement, puis reviens ici.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
