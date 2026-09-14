import type { ReactNode } from "react";

export function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="mb-0 font-[var(--font-ibm-plex-mono)] text-[11px] uppercase tracking-[0.08em] text-[var(--orange-deep)]">
          {eyebrow}
        </div>
        <h1 className="font-[var(--font-sora)] text-[21px] font-bold">
          {title}
        </h1>
      </div>
      {action}
    </div>
  );
}
