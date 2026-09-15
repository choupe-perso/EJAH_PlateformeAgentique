"use client";

import { useState } from "react";
import { TextInput } from "@/components/form/TextInput";
import { ActionButton } from "@/components/ActionButton";
import { LIBELLE_CATEGORIE, CATEGORIES_SOURCE } from "@/shared/veille/types";
import type { SourceProposee, VeilleSourceCategorie } from "@/shared/veille/types";

// EXG-014 : l'IA propose, l'utilisateur decide (accepter/refuser/ajouter/retirer).
export function SourcesEditor({
  sources,
  onChange,
}: {
  sources: SourceProposee[];
  onChange: (sources: SourceProposee[]) => void;
}) {
  const [libelle, setLibelle] = useState("");
  const [url, setUrl] = useState("");
  const [categorie, setCategorie] = useState<VeilleSourceCategorie>("officielle");

  function retirer(index: number) {
    onChange(sources.filter((_, i) => i !== index));
  }

  function ajouter() {
    if (!libelle.trim()) return;
    onChange([...sources, { categorie, libelle: libelle.trim(), url: url.trim() || null }]);
    setLibelle("");
    setUrl("");
  }

  return (
    <div className="flex flex-col gap-2.5">
      {sources.length === 0 && <p className="text-xs text-[var(--ink-soft)]">Aucune source pour le moment.</p>}
      <ul className="flex flex-col gap-2">
        {sources.map((s, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-2"
          >
            <div className="min-w-0">
              <span className="mr-2 rounded-full bg-[var(--util-bg)] px-2 py-0.5 font-[var(--font-ibm-plex-mono)] text-[10px] font-semibold uppercase text-[var(--util-ink)]">
                {LIBELLE_CATEGORIE[s.categorie]}
              </span>
              <span className="text-sm font-medium">{s.libelle}</span>
              {s.url && <div className="truncate text-[11px] text-[var(--ink-soft)]">{s.url}</div>}
            </div>
            <button
              type="button"
              onClick={() => retirer(i)}
              className="flex-none rounded-[9px] bg-[var(--util-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--critical)]"
            >
              Retirer
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-[var(--line)] p-2.5">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES_SOURCE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategorie(c)}
              className={
                "rounded-full border-[1.5px] px-2.5 py-1 text-[11px] font-semibold " +
                (categorie === c
                  ? "border-[var(--orange)] bg-[var(--orange)] text-white"
                  : "border-[var(--line)] bg-white text-[#5C4F49]")
              }
            >
              {LIBELLE_CATEGORIE[c]}
            </button>
          ))}
        </div>
        <TextInput
          placeholder="Nom de la source"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          className="min-w-[140px] flex-1"
        />
        <TextInput placeholder="URL (optionnel)" value={url} onChange={(e) => setUrl(e.target.value)} className="min-w-[140px] flex-1" />
        <ActionButton variant="ghost" onClick={ajouter}>
          Ajouter
        </ActionButton>
      </div>
    </div>
  );
}
