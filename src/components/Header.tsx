"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { AppEnvironment } from "@/shared/env";
import { CheckIcon, CopyIcon } from "@/components/icons";

const NAV_ITEMS = [
  { href: "/cockpit", label: "Cockpit" },
  { href: "/agents", label: "Mes Agents" },
] as const;

export function Header({
  environment,
  racineProjet,
}: {
  environment: AppEnvironment | null;
  racineProjet: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copie, setCopie] = useState(false);

  const isActive = (href: string) => pathname?.startsWith(href) ?? false;

  async function copierRacine() {
    try {
      await navigator.clipboard.writeText(racineProjet);
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    } catch {
      // Presse-papiers indisponible (contexte non securise, permission
      // refusee) - ignore silencieusement, le chemin reste lisible a l'ecran.
    }
  }

  return (
    <header className="sticky top-0 z-20">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--canvas)] px-4 py-1.5 font-[var(--font-ibm-plex-mono)] text-[11px] text-[var(--ink-soft)] max-[720px]:px-4 sm:px-7">
        <span className="flex-none">
          Site v1.0 <span className="text-[var(--violet)]">· socle</span>
        </span>
        <div className="flex min-w-0 items-center gap-3 max-[720px]:hidden">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate" title={racineProjet}>
              {racineProjet}
            </span>
            <button
              type="button"
              onClick={copierRacine}
              aria-label="Copier le chemin racine"
              className="flex flex-none items-center justify-center rounded p-1 text-[var(--ink-soft)] hover:bg-[var(--util-bg)] hover:text-[var(--ink)]"
            >
              {copie ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
          <span className="flex-none">Donnees non chargees</span>
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-3 bg-[linear-gradient(100deg,var(--orange)_0%,var(--topbar-mid)_45%,var(--rose)_100%)] px-4 py-3.5 sm:px-7">
        <Link href="/" className="flex flex-none items-center gap-2.5">
          <img
            src="/favicon.png"
            alt="EJAH"
            width={30}
            height={30}
            className="block rounded-lg bg-white p-0.5"
          />
          <span className="font-[var(--font-sora)] text-lg font-bold tracking-tight text-white">
            EJAH
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 rounded-full bg-white/[0.16] p-1 text-[14.5px] font-semibold max-[720px]:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                "block rounded-full px-[18px] py-2 " +
                (isActive(item.href)
                  ? "bg-white text-[var(--orange-deep)]"
                  : "text-white/[0.88]")
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-none items-center gap-3">
          <span className="rounded-full border border-white/50 bg-white/20 px-2.5 py-1 font-[var(--font-ibm-plex-mono)] text-[11px] font-medium tracking-wide text-white">
            {environment ? environment.toUpperCase() : "?"}
          </span>
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/25 text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16}>
              <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" />
            </svg>
          </div>
          <button
            type="button"
            aria-label="Ouvrir le menu"
            onClick={() => setMobileOpen((open) => !open)}
            className="hidden h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-white/[0.22] max-[720px]:flex"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              width={17}
              height={17}
              className="text-white"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div className="absolute inset-x-0 top-full z-30 flex flex-col gap-0.5 border-b border-[var(--line)] bg-white p-2 shadow-[0_12px_24px_-12px_rgba(36,26,22,0.25)]">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={
                  "rounded-[9px] px-3.5 py-3 text-left text-[14.5px] font-semibold " +
                  (isActive(item.href)
                    ? "bg-[var(--tint-active-bg)] text-[var(--orange-deep)]"
                    : "text-[var(--ink)]")
                }
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
