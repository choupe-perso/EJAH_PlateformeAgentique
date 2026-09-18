"use client";

import { LIBELLE_MOTEUR, MOTEURS } from "@/shared/veille/types";
import type { VeilleMoteur } from "@/shared/veille/types";

export function MoteurPicker({
  valeur,
  onChange,
  options = MOTEURS,
}: {
  valeur: VeilleMoteur | null;
  onChange: (moteur: VeilleMoteur) => void;
  options?: VeilleMoteur[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-[9px]">
        {options.map((m) => (
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
        <p className="text-[11px] text-[var(--ink-soft)]">
          Mode manuel, hors IA - EJAH ne se connecte jamais à ta place (EXG-005). Tu échanges toi-même sur{" "}
          <a
            href="https://chatgpt.com"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[var(--orange-deep)] underline"
          >
            chatgpt.com
          </a>
          , puis colles la réponse ici.
        </p>
      )}
    </div>
  );
}
