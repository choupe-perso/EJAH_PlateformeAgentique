import type { ReactNode } from "react";
import Image from "next/image";

export function Footer({ children }: { children: ReactNode }) {
  return (
    <footer className="mx-auto max-w-5xl px-4 pb-8 pt-2 sm:px-7">
      {children}
    </footer>
  );
}

export function FooterDates({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2.5">{children}</div>
  );
}

export function FooterHistCols({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">{children}</div>
  );
}

export function FooterSignature({
  environment,
}: {
  environment: string;
}) {
  return (
    <div className="mt-[26px] border-t border-[var(--line)] pt-[22px] text-center">
      <Image
        src="/logo.png"
        alt="EJAH"
        width={110}
        height={110}
        className="mx-auto mb-2.5 block h-auto w-[110px] opacity-90"
      />
      <p className="m-0 font-[var(--font-ibm-plex-mono)] text-[11px] text-[var(--ink-soft2)]">
        © 2026 EJAH — Écosystème de Jonction et d&apos;Assistance Humaine ·
        Environnement {environment}
      </p>
    </div>
  );
}
