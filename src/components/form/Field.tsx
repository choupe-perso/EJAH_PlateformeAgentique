import type { ReactNode } from "react";

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
  children,
}: {
  label: string;
  family: "user" | "platform";
  span2?: boolean;
  children: ReactNode;
}) {
  const borderColor = FIELD_FAMILY_COLOR[family];
  const tagClass =
    family === "user"
      ? "bg-[#FFE4CF] text-[#C9430A]"
      : "bg-[var(--util-bg)] text-[var(--util-ink)]";
  const tagText = family === "user" ? "Utilisateur" : "Plateforme";

  return (
    <div className={"flex flex-col gap-[7px] " + (span2 ? "sm:col-span-2" : "")}>
      <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-soft)]">
        {label}
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
