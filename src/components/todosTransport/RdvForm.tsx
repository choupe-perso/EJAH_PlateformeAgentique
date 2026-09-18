"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ActionButton";
import { TextInput, TextArea } from "@/components/form/TextInput";
import { SelectChips } from "./SelectChips";

const ALERTES = ["5", "10", "30", "60", "120"] as const;

export function RdvForm({ onCree }: { onCree: () => void }) {
  const [titre, setTitre] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dureeMinutes, setDureeMinutes] = useState(60);
  const [alerteMinutes, setAlerteMinutes] = useState<string>("30");
  const [description, setDescription] = useState("");
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre() {
    setEnvoi(true);
    setErreurs([]);
    try {
      const reponse = await fetch("/api/agents/todos-transport/taches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "rdv", titre, dateDebut, dureeMinutes, alerteMinutes, description }),
      });
      const donnees = await reponse.json();
      if (!donnees.ok) {
        setErreurs(donnees.erreurs ?? ["Erreur inconnue."]);
        return;
      }
      setTitre("");
      setDateDebut("");
      setDescription("");
      onCree();
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      {erreurs.length > 0 && (
        <ul className="rounded-lg border border-[var(--critical)] bg-white px-3 py-2 text-sm text-[var(--critical)]">
          {erreurs.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Titre</label>
        <TextInput value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex : RDV dentiste" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Date et heure</label>
        <TextInput type="datetime-local" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Durée (minutes)</label>
        <TextInput
          type="number"
          min={1}
          value={dureeMinutes}
          onChange={(e) => setDureeMinutes(Number(e.target.value))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Alerte avant le RDV</label>
        <SelectChips
          value={alerteMinutes}
          onChange={setAlerteMinutes}
          options={ALERTES.map((a) => ({ value: a, label: `${a} min` }))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Description (optionnelle)</label>
        <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <ActionButton disabled={envoi} variant={envoi ? "loading" : "primary"} onClick={soumettre}>
        Enregistrer le RDV
      </ActionButton>
    </div>
  );
}
