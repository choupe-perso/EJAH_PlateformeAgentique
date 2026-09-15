import type { ReactNode } from "react";

// "platform" utilise --util-ink plutot qu'une couleur fixe : --orange
// change de teinte par environnement (cyan en DEV, vert en TEST, orange
// en PROD) et coincidait exactement avec un cyan fixe en DEV, rendant
// les deux liserets indiscernables. --util-ink est deja environnement-
// specifique et toujours visuellement distinct de --orange.
export const FIELD_FAMILY_COLOR = {
  user: "var(--orange)",
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
      ? "bg-[#FFE4CF] text-[var(--orange-deep)]"
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
