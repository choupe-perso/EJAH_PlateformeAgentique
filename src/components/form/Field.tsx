import type { ReactNode } from "react";

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
  const borderColor = family === "user" ? "var(--orange)" : "#00B4D8";
  const tagClass =
    family === "user"
      ? "bg-[#FFE4CF] text-[var(--orange-deep)]"
      : "bg-[#DFF6FB] text-[#0086A3]";
  const tagText = family === "user" ? "Utilisateur" : "Plateforme";

  return (
    <div
      className={
        "flex flex-col gap-[7px] border-l-[3px] pl-[11px] " +
        (span2 ? "sm:col-span-2" : "")
      }
      style={{ borderColor }}
    >
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
      {children}
    </div>
  );
}
