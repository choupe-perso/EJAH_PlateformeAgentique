import type { ReactNode } from "react";

export function AgentList({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card)]">
      {children}
    </div>
  );
}

export function AgentRow({
  name,
  dotColor,
  meta,
  children,
}: {
  name: string;
  dotColor: string;
  meta: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3.5 border-b border-[var(--line)] px-4 py-3.5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2.5 text-sm font-semibold">
        <span
          className="h-2 w-2 flex-none rounded-full"
          style={{ background: dotColor }}
        />
        <span>
          {name}{" "}
          <span className="font-[var(--font-ibm-plex-mono)] text-[11.5px] font-normal text-[var(--ink-soft)]">
            · {meta}
          </span>
        </span>
      </div>
      <div className="flex flex-none gap-2">{children}</div>
    </div>
  );
}
