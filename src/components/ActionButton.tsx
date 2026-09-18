import type { ReactNode } from "react";
import { SpinnerIcon } from "./icons";

const VARIANT_CLASSES = {
  primary: "bg-[var(--btn-action-bg)] text-white",
  loading: "bg-[var(--btn-action-bg)] text-white cursor-wait",
  success: "bg-[var(--good)] text-white",
  error: "bg-[var(--critical)] text-white",
  ghost: "border border-[var(--line)] bg-transparent text-[var(--ink-soft)] hover:bg-[var(--util-bg)]",
} as const;

export function ActionButton({
  variant = "primary",
  icon,
  disabled,
  onClick,
  type = "button",
  children,
}: {
  variant?: keyof typeof VARIANT_CLASSES;
  icon?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  children: ReactNode;
}) {
  // Un bouton "loading" reste plein contraste et affiche un spinner - seul
  // un bouton reellement inerte (disabled hors chargement, ex. les autres
  // actions pendant qu'une operation tourne) est estompe.
  const enChargement = variant === "loading";

  return (
    <button
      type={type}
      disabled={disabled ?? enChargement}
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 whitespace-nowrap rounded-[9px] px-4 py-2.5 font-[var(--font-plus-jakarta-sans)] text-[13.5px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--violet)] focus-visible:outline-offset-2 " +
        (enChargement ? "" : "disabled:cursor-not-allowed disabled:opacity-45 ") +
        VARIANT_CLASSES[variant]
      }
    >
      {enChargement ? <SpinnerIcon /> : icon}
      <span>{children}</span>
    </button>
  );
}
