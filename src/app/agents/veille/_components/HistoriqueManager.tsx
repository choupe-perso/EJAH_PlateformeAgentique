"use client";

import { useCallback, useEffect, useState } from "react";
import { TextInput } from "@/components/form/TextInput";
import { InfoCard } from "./InfoCard";
import type { EvenementDTO, PeriodeHistorique } from "@/shared/veille/types";

const PERIODES: { valeur: PeriodeHistorique; label: string }[] = [
  { valeur: "aujourdhui", label: "Aujourd'hui" },
  { valeur: "7j", label: "7 jours" },
  { valeur: "30j", label: "30 jours" },
  { valeur: "tout", label: "Tout" },
];

export function HistoriqueManager({ sujetIdInitial }: { sujetIdInitial?: string }) {
  const [periode, setPeriode] = useState<PeriodeHistorique>("tout");
  const [inclureConnu, setInclureConnu] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [evenements, setEvenements] = useState<EvenementDTO[]>([]);
  const [chargement, setChargement] = useState(true);

  const rafraichir = useCallback(async () => {
    setChargement(true);
    try {
      const params = new URLSearchParams({ periode, inclureConnu: inclureConnu ? "1" : "0" });
      if (sujetIdInitial) params.set("sujetId", sujetIdInitial);
      if (recherche.trim()) params.set("q", recherche.trim());
      const reponse = await fetch(`/api/veille/evenements?${params.toString()}`);
      const donnees = await reponse.json();
      if (donnees.ok) setEvenements(donnees.evenements);
    } finally {
      setChargement(false);
    }
  }, [periode, inclureConnu, recherche, sujetIdInitial]);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {PERIODES.map((p) => (
            <button
              key={p.valeur}
              type="button"
              onClick={() => setPeriode(p.valeur)}
              className={
                "rounded-full border-[1.5px] px-[13px] py-[5px] text-[12px] font-semibold " +
                (periode === p.valeur
                  ? "border-[var(--orange)] bg-[var(--orange)] text-white"
                  : "border-[var(--line)] bg-white text-[#5C4F49]")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
          <input type="checkbox" checked={inclureConnu} onChange={(e) => setInclureConnu(e.target.checked)} />
          Afficher les confirmations (CONNU)
        </label>
        <TextInput
          placeholder="Rechercher…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="max-w-[220px]"
        />
      </div>

      {chargement && <p className="text-sm text-[var(--ink-soft)]">Chargement…</p>}
      {!chargement && evenements.length === 0 && <p className="text-sm text-[var(--ink-soft)]">Aucun résultat.</p>}

      <ul className="flex flex-col gap-2.5">
        {evenements.map((e) => (
          <li key={e.id}>
            <InfoCard evenement={e} />
          </li>
        ))}
      </ul>
    </div>
  );
}
