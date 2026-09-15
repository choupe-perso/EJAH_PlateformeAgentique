"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/components/ActionButton";
import { TextInput } from "@/components/form/TextInput";

type Voyage = {
  id: string;
  dossier: string;
  annee: number;
  mois: number;
  jour: number;
  heureDepart: [number, number];
  heureArrivee: [number, number];
  gareDepart: string;
  gareArrivee: string;
  trainNumero: string;
  duree: string;
};

function formaterHeure([h, m]: [number, number]) {
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
}

export function VoyagesManager() {
  const [configures, setConfigures] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);

  const [recuperation, setRecuperation] = useState(false);
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [generation, setGeneration] = useState(false);

  useEffect(() => {
    fetch("/api/agents/voyages/identifiants")
      .then((r) => r.json())
      .then((d) => setConfigures(Boolean(d.configures)))
      .catch(() => setConfigures(false));
  }, []);

  async function enregistrerIdentifiants() {
    setEnregistrement(true);
    setErreurs([]);
    try {
      const reponse = await fetch("/api/agents/voyages/identifiants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, motDePasse }),
      });
      const donnees = await reponse.json();
      if (!donnees.ok) {
        setErreurs(donnees.erreurs ?? ["Erreur inconnue."]);
        return;
      }
      setConfigures(true);
      setEmail("");
      setMotDePasse("");
    } finally {
      setEnregistrement(false);
    }
  }

  async function recupererVoyages() {
    setRecuperation(true);
    setErreurs([]);
    setVoyages([]);
    try {
      const reponse = await fetch("/api/agents/voyages/recuperer", { method: "POST" });
      const donnees = await reponse.json();
      if (!donnees.ok) {
        setErreurs(donnees.erreurs ?? ["Erreur inconnue."]);
        return;
      }
      setVoyages(donnees.voyages);
      setSelection(new Set(donnees.voyages.map((v: Voyage) => v.id)));
    } finally {
      setRecuperation(false);
    }
  }

  function basculerSelection(id: string) {
    setSelection((prec) => {
      const suivant = new Set(prec);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  async function genererCalendrier() {
    setGeneration(true);
    setErreurs([]);
    try {
      const voyagesSelectionnes = voyages.filter((v) => selection.has(v.id));
      const reponse = await fetch("/api/agents/voyages/generer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voyages: voyagesSelectionnes }),
      });
      if (!reponse.ok) {
        const donnees = await reponse.json().catch(() => ({}));
        setErreurs(donnees.erreurs ?? ["Erreur inconnue."]);
        return;
      }
      const blob = await reponse.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "voyages_sncf.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setGeneration(false);
    }
  }

  return (
    <div className="mt-2 max-w-2xl">
      {erreurs.length > 0 && (
        <ul className="mb-4 rounded-lg border border-[var(--critical)] bg-white px-3 py-2 text-sm text-[var(--critical)]">
          {erreurs.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--card)] p-4">
        <div className="mb-3 text-xs font-semibold text-[var(--ink-soft)]">
          Identifiants SNCF Connect{" "}
          {configures && <span className="text-[var(--good)]">· déjà enregistrés</span>}
        </div>
        <p className="mb-3 text-xs text-[var(--ink-soft)]">
          Stockés dans le Gestionnaire d&apos;identifiants Windows, jamais en clair ailleurs.
          {configures ? " Renseigne ces champs uniquement pour les remplacer." : ""}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <TextInput
            type="email"
            placeholder="Email SNCF Connect"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextInput
            type="password"
            placeholder="Mot de passe"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
        </div>
        <div className="mt-3">
          <ActionButton
            variant={enregistrement ? "loading" : "primary"}
            disabled={enregistrement || !email || !motDePasse}
            onClick={enregistrerIdentifiants}
          >
            Enregistrer les identifiants
          </ActionButton>
        </div>
      </div>

      <ActionButton
        variant={recuperation ? "loading" : "primary"}
        disabled={recuperation}
        onClick={recupererVoyages}
      >
        {recuperation ? "Connexion à SNCF Connect…" : "Récupérer mes voyages"}
      </ActionButton>
      {recuperation && (
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          Une fenêtre Chrome s&apos;ouvre. Si une double authentification est
          demandée, termine-la dans cette fenêtre — la récupération continue
          automatiquement ensuite (jusqu&apos;à 5 minutes).
        </p>
      )}

      {voyages.length > 0 && (
        <div className="mt-5">
          <div className="mb-2.5 text-xs font-semibold text-[var(--ink-soft)]">
            Voyages trouvés ({voyages.length})
          </div>
          <ul className="mb-4 flex flex-col gap-2">
            {voyages.map((v) => (
              <li
                key={v.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={selection.has(v.id)}
                  onChange={() => basculerSelection(v.id)}
                  className="h-4 w-4 flex-none accent-[var(--orange)]"
                />
                <div className="min-w-0 text-sm">
                  <span className="font-semibold text-[var(--ink)]">
                    {v.gareDepart} → {v.gareArrivee}
                  </span>
                  <span className="ml-2 font-[var(--font-ibm-plex-mono)] text-[11px] text-[var(--ink-soft)]">
                    {String(v.jour).padStart(2, "0")}/{String(v.mois).padStart(2, "0")}/{v.annee} ·{" "}
                    {formaterHeure(v.heureDepart)} → {formaterHeure(v.heureArrivee)} · {v.trainNumero}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <ActionButton
            variant={generation ? "loading" : "success"}
            disabled={generation || selection.size === 0}
            onClick={genererCalendrier}
          >
            Générer le calendrier ({selection.size})
          </ActionButton>
        </div>
      )}
    </div>
  );
}
