import type { ReactNode } from "react";

export function UtilityIconButton({
  title,
  icon,
  label,
}: {
  title: string;
  icon: ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={label ? undefined : title}
      className="flex items-center overflow-hidden rounded-[9px] bg-[var(--util-bg)] font-[var(--font-plus-jakarta-sans)] text-[13.5px] font-semibold text-[var(--util-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--violet)] focus-visible:outline-offset-2"
    >
      <span className="flex items-center justify-center bg-[var(--util-cell)] px-2.5 py-[9px]">
        {icon}
      </span>
      {label && <span className="py-[9px] pl-1 pr-3.5">{label}</span>}
    </button>
  );
}
