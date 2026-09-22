import type { ReactNode } from "react";

const VARIANT_CLASSES = {
  primary: "bg-[var(--btn-action-bg)] text-white",
  loading: "bg-[var(--btn-action-bg)] text-white opacity-55 cursor-not-allowed",
  success: "bg-[var(--good)] text-white",
  error: "bg-[var(--critical)] text-white",
} as const;

export function ActionButton({
  variant = "primary",
  icon,
  disabled,
  type = "button",
  onClick,
  children,
}: {
  variant?: keyof typeof VARIANT_CLASSES;
  icon?: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled ?? variant === "loading"}
      className={
        "inline-flex items-center gap-2 whitespace-nowrap rounded-[9px] px-4 py-2.5 font-[var(--font-plus-jakarta-sans)] text-[13.5px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--violet)] focus-visible:outline-offset-2 " +
        VARIANT_CLASSES[variant]
      }
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
