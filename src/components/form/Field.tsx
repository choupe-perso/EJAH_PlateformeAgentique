"use client";

import { useState, type ReactNode } from "react";
import { CheckIcon, CopyIcon } from "@/components/icons";

// Couleurs fixes (non liees au theme d'environnement) et volontairement
// tres contrastees : --orange change de teinte par environnement (cyan
// en DEV, vert en TEST, orange en PROD), donc rendait la distinction
// Utilisateur/Plateforme peu ou pas visible selon l'environnement.
// "Utilisateur" est toujours orange, "Plateforme" toujours bleu fonce,
// quel que soit l'environnement.
export const FIELD_FAMILY_COLOR = {
  user: "#FF6A00",
  platform: "var(--util-ink)",
} as const;

export function Field({
  label,
  family,
  span2,
  texteACopier,
  children,
}: {
  label: string;
  family: "user" | "platform";
  span2?: boolean;
  // Si fourni, affiche un bouton copier dans le presse-papiers a cote du
  // libelle - utile pour un champ genere (texte, titre...) que l'on veut
  // reutiliser ailleurs sans passer par une selection manuelle.
  texteACopier?: string;
  children: ReactNode;
}) {
  const [copie, setCopie] = useState(false);
  const borderColor = FIELD_FAMILY_COLOR[family];
  const tagClass =
    family === "user"
      ? "bg-[#FFE4CF] text-[#C9430A]"
      : "bg-[var(--util-bg)] text-[var(--util-ink)]";
  const tagText = family === "user" ? "Utilisateur" : "Plateforme";

  async function copier() {
    if (!texteACopier) return;
    try {
      await navigator.clipboard.writeText(texteACopier);
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    } catch {
      // Presse-papiers indisponible (contexte non securise, permission
      // refusee) - ignore silencieusement, le champ reste lisible a l'ecran.
    }
  }

  return (
    <div className={"flex flex-col gap-[7px] " + (span2 ? "sm:col-span-2" : "")}>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-soft)]">
        {label}
        {texteACopier !== undefined && (
          <button
            type="button"
            onClick={copier}
            aria-label={`Copier ${label}`}
            className="flex flex-none items-center justify-center rounded p-0.5 text-[var(--ink-soft)] hover:bg-[var(--util-bg)] hover:text-[var(--ink)]"
          >
            {copie ? <CheckIcon /> : <CopyIcon />}
          </button>
        )}
        <span
          className={
            "ml-auto rounded-full px-1.5 py-0.5 font-[var(--font-ibm-plex-mono)] text-[9px] font-semibold uppercase tracking-wide " +
            tagClass
          }
        >
          {tagText}
        </span>
      </span>
      <div className="border-l-[3px] pl-[6px]" style={{ borderColor }}>
        {children}
      </div>
    </div>
  );
}
