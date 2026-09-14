import type { ReactNode } from "react";

export function HistPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-[17px] py-4">
      <div className="mb-3.5 text-[11.5px] font-bold uppercase tracking-[0.04em] text-[var(--ink-soft)]">
        {title}
      </div>
      {children}
    </div>
  );
}
