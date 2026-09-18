import type { ReactNode } from "react";
import { FIELD_FAMILY_COLOR } from "./fieldFamilyColor";

function LegendItem({ family, label }: { family: "user" | "platform"; label: string }) {
  return (
    <span className="flex items-center gap-2 text-sm text-[var(--ink)]">
      <span
        className="inline-block h-4 w-[3px] flex-none rounded-full"
        style={{ background: FIELD_FAMILY_COLOR[family] }}
      />
      {label}
    </span>
  );
}

export function FieldLegend({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2 font-[var(--font-ibm-plex-mono)] text-[11px] uppercase tracking-[0.08em] text-[var(--violet)]">
        Exemple
      </div>
      <div className="mb-3 flex flex-wrap gap-5">
        <LegendItem family="user" label="Utilisateur — renseigné manuellement" />
        <LegendItem family="platform" label="Plateforme — générée automatiquement" />
      </div>
      <div className="grid grid-cols-1 gap-[18px] rounded-2xl border border-[var(--line)] bg-[var(--canvas)] p-4 sm:grid-cols-2 sm:p-5">
        {children}
      </div>
    </div>
  );
}
