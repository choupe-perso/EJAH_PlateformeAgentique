"use client";

import { ActionButton } from "@/components/ActionButton";

// EXG-016 : reformulation intelligible + 4 actions, aucun sujet actif sans
// validation explicite.
export function ContractSummary({
  texte,
  erreurs,
  chargement,
  onValider,
  onModifier,
  onContinuerDiscussion,
  onAnnuler,
}: {
  texte: string;
  erreurs: string[];
  chargement: boolean;
  onValider: () => void;
  onModifier: () => void;
  onContinuerDiscussion: () => void;
  onAnnuler: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <pre className="whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-3.5 font-[var(--font-ibm-plex-mono)] text-[12.5px] leading-relaxed text-[var(--ink)]">
        {texte}
      </pre>
      {erreurs.length > 0 && (
        <ul className="rounded-lg border border-[var(--critical)] bg-[#FDECEB] px-3 py-2 text-xs text-[var(--critical)]">
          {erreurs.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <ActionButton variant={chargement ? "loading" : "primary"} disabled={chargement} onClick={onValider}>
          Valider
        </ActionButton>
        <ActionButton variant="ghost" onClick={onModifier}>
          Modifier
        </ActionButton>
        <ActionButton variant="ghost" onClick={onContinuerDiscussion}>
          Continuer la discussion
        </ActionButton>
        <ActionButton variant="ghost" onClick={onAnnuler}>
          Annuler
        </ActionButton>
      </div>
    </div>
  );
}
