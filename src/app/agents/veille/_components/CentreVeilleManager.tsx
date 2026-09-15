"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { KpiTile } from "@/components/KpiTile";
import { ActionButton } from "@/components/ActionButton";
import { ArrowRightIcon, SpinnerIcon } from "@/components/icons";
import { InfoCard } from "./InfoCard";
import { useChrono, formaterDuree } from "./useChrono";
import type { EvenementDTO, SyntheseVeille } from "@/shared/veille/types";

export function CentreVeilleManager() {
  const [synthese, setSynthese] = useState<SyntheseVeille | null>(null);
  const [evenements, setEvenements] = useState<EvenementDTO[]>([]);
  const [chargement, setChargement] = useState(true);
  const [lancement, setLancement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const secondesLancement = useChrono(lancement);

  const rafraichir = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [repSynthese, repEvenements] = await Promise.all([
        fetch("/api/veille/synthese"),
        fetch("/api/veille/evenements"),
      ]);
      const [donneesSynthese, donneesEvenements] = await Promise.all([repSynthese.json(), repEvenements.json()]);
      if (donneesSynthese.ok) setSynthese(donneesSynthese.synthese);
      if (donneesEvenements.ok) setEvenements(donneesEvenements.evenements);
      if (!donneesSynthese.ok || !donneesEvenements.ok) setErreur("Certaines données n'ont pas pu être chargées.");
    } catch {
      setErreur("Impossible de contacter le serveur.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  async function lancerVeille() {
    setLancement(true);
    try {
      await fetch("/api/veille/run", { method: "POST" });
    } finally {
      setLancement(false);
      rafraichir();
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Link href="/agents/veille/sujets" className="text-xs text-[var(--orange-deep)] hover:underline">
            Gérer les sujets
          </Link>
          <span className="text-[var(--line)]">·</span>
          <Link href="/agents/veille/historique" className="text-xs text-[var(--orange-deep)] hover:underline">
            Historique
          </Link>
        </div>
        <ActionButton
          variant={lancement ? "loading" : "primary"}
          icon={lancement ? <SpinnerIcon /> : <ArrowRightIcon />}
          disabled={lancement}
          onClick={lancerVeille}
        >
          {lancement ? `Veille en cours… (${formaterDuree(secondesLancement)})` : "Lancer la veille"}
        </ActionButton>
      </div>

      {erreur && (
        <p className="mb-3 rounded-lg border border-[var(--critical)] bg-[#FDECEB] px-3 py-2 text-sm text-[var(--critical)]">
          {erreur}
        </p>
      )}

      {synthese && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <KpiTile label="Sujets actifs" value={String(synthese.sujetsActifs)} trend="" />
          <KpiTile label="Nouveautés" value={String(synthese.nouveautes)} trend="" trendUp={synthese.nouveautes > 0} />
          <KpiTile label="Non lus" value={String(synthese.nonLus)} trend="" trendUp={synthese.nonLus > 0} />
          <KpiTile
            label="Dernière veille"
            value={synthese.derniereExecution ? synthese.derniereExecution.statut : "—"}
            trend={
              synthese.derniereExecution
                ? new Date(synthese.derniereExecution.demarreeAt).toLocaleString("fr-FR")
                : "jamais lancée"
            }
          />
        </div>
      )}

      <div className="mb-2.5 text-xs font-semibold text-[var(--ink-soft)]">Nouveautés</div>
      {chargement && <p className="text-sm text-[var(--ink-soft)]">Chargement…</p>}
      {!chargement && evenements.length === 0 && (
        <p className="text-sm text-[var(--ink-soft)]">Aucune nouveauté pour le moment - c&apos;est un résultat normal.</p>
      )}
      <ul className="flex flex-col gap-2.5">
        {evenements.map((e) => (
          <li key={e.id}>
            <InfoCard evenement={e} onLu={() => rafraichir()} />
          </li>
        ))}
      </ul>
    </div>
  );
}
