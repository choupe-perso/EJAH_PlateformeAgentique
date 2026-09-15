"use client";

import { useState } from "react";
import type { EvenementDTO, TraceabiliteDTO } from "@/shared/veille/types";

const BADGE_CLASSES: Record<string, string> = {
  nouveau: "bg-[var(--orange)] text-white",
  modifie: "bg-[var(--warn)] text-white",
  connu: "bg-[var(--util-bg)] text-[var(--util-ink)]",
};

const BADGE_LABEL: Record<string, string> = { nouveau: "NOUVEAU", modifie: "MODIFIÉ", connu: "CONNU" };

// EXG-061/072 : la carte affiche le statut, un resume court, les sources
// dedupliquees, et bascule lu/non lu a l'ouverture (le clic sur le corps,
// pas sur un lien de source).
export function InfoCard({ evenement, onLu }: { evenement: EvenementDTO; onLu?: (id: string) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [trace, setTrace] = useState<TraceabiliteDTO | null>(null);
  const [chargementTrace, setChargementTrace] = useState(false);

  async function basculer() {
    const nouvelEtat = !ouvert;
    setOuvert(nouvelEtat);
    if (nouvelEtat) {
      if (!evenement.lu) {
        await fetch(`/api/veille/evenements/${evenement.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lu: true }),
        });
        onLu?.(evenement.id);
      }
      if (!trace) {
        setChargementTrace(true);
        try {
          const reponse = await fetch(`/api/veille/evenements/${evenement.id}`);
          const donnees = await reponse.json();
          if (donnees.ok) setTrace(donnees.traceabilite);
        } finally {
          setChargementTrace(false);
        }
      }
    }
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3">
      <div className="flex cursor-pointer items-start justify-between gap-3" onClick={basculer}>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className={"rounded-full px-2 py-0.5 font-[var(--font-ibm-plex-mono)] text-[10px] font-semibold " + BADGE_CLASSES[evenement.statut]}>
              {BADGE_LABEL[evenement.statut]}
            </span>
            {!evenement.lu && <span className="h-1.5 w-1.5 rounded-full bg-[var(--orange)]" title="Non lu" />}
            <span className="text-[11px] text-[var(--ink-soft)]">{evenement.sujetNom}</span>
          </div>
          <div className="text-sm font-semibold text-[var(--ink)]">{evenement.titre}</div>
          <div className="mt-0.5 text-[13px] text-[var(--ink-soft)]">{evenement.resume}</div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-[var(--font-ibm-plex-mono)] text-[10.5px] text-[var(--ink-soft2)]">
            <span>Détecté le {new Date(evenement.derniereDetectionAt).toLocaleString("fr-FR")}</span>
            {evenement.sources.map((s) =>
              s.url ? (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[var(--orange-deep)] hover:underline"
                >
                  {s.libelle}
                </a>
              ) : (
                <span key={s.id}>{s.libelle}</span>
              )
            )}
          </div>
        </div>
      </div>

      {ouvert && (
        <div className="mt-3 border-t border-[var(--line)] pt-3">
          {chargementTrace && <p className="text-xs text-[var(--ink-soft)]">Chargement de la traçabilité…</p>}
          {trace && (
            <div className="flex flex-col gap-2 text-xs text-[var(--ink-soft)]">
              <div>
                Première détection : {new Date(trace.evenement.premiereDetectionAt).toLocaleString("fr-FR")}
              </div>
              {trace.versions.length > 0 && (
                <div>
                  <div className="font-semibold text-[var(--ink)]">Historique des versions</div>
                  <ul className="ml-3 list-disc">
                    {trace.versions.map((v) => (
                      <li key={v.id}>
                        {new Date(v.detecteAt).toLocaleString("fr-FR")} — avant :{" "}
                        {v.donneesAvant ? JSON.stringify(v.donneesAvant) : "(aucune)"} → après : {JSON.stringify(v.donneesApres)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <div className="font-semibold text-[var(--ink)]">Observations ({trace.observations.length})</div>
                <ul className="ml-3 list-disc">
                  {trace.observations.map((o) => (
                    <li key={o.id}>
                      {o.collecte.source.libelle} — {new Date(o.creeLe).toLocaleString("fr-FR")}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
