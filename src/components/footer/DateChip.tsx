import type { ReactNode } from "react";

export function DateChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card)] px-[15px] py-2 font-[var(--font-ibm-plex-mono)] text-[11.5px] text-[#5C4F49]">
      <span className="flex-none text-[var(--ink-soft2)] [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
      </span>
      {children}
    </span>
  );
}
