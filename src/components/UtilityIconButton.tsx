import type { ReactNode } from "react";

export function UtilityIconButton({
  title,
  icon,
}: {
  title: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className="overflow-hidden rounded-[9px] bg-[var(--util-bg)] text-[var(--util-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--violet)] focus-visible:outline-offset-2"
    >
      <span className="flex items-center justify-center bg-[var(--util-cell)] px-2.5 py-[9px]">
        {icon}
      </span>
    </button>
  );
}
