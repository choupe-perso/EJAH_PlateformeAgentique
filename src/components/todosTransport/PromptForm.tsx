"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ActionButton";
import { TextInput, TextArea } from "@/components/form/TextInput";
import { SelectChips } from "./SelectChips";
import type { NiveauPrompt } from "@/integrations/ollama/redactionTransport";

const IAS = ["chatgpt", "copilot", "gemini", "claude"] as const;

export function PromptForm({ onCree }: { onCree: () => void }) {
  const [ia, setIa] = useState<(typeof IAS)[number]>("claude");
  const [projet, setProjet] = useState("");
  const [titre, setTitre] = useState("");
  const [notes, setNotes] = useState("");
  const [niveau, setNiveau] = useState<NiveauPrompt>("structure");
  const [texte, setTexte] = useState("");
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [redaction, setRedaction] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  async function genererBrouillon() {
    setRedaction(true);
    setErreurs([]);
    try {
      const reponse = await fetch("/api/agents/todos-transport/brouillon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "prompt", ia, projet, titre, notes, niveau }),
      });
      const donnees = await reponse.json();
      if (!donnees.ok) {
        setErreurs(donnees.erreurs ?? ["Erreur inconnue."]);
        return;
      }
      setTexte(donnees.texte);
    } finally {
      setRedaction(false);
    }
  }

  async function soumettre() {
    setEnvoi(true);
    setErreurs([]);
    try {
      const reponse = await fetch("/api/agents/todos-transport/taches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "prompt", titre, ia, projet, texte, notesBrutes: notes }),
      });
      const donnees = await reponse.json();
      if (!donnees.ok) {
        setErreurs(donnees.erreurs ?? ["Erreur inconnue."]);
        return;
      }
      setProjet("");
      setTitre("");
      setNotes("");
      setTexte("");
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
        <label className="text-xs font-semibold text-[var(--ink-soft)]">IA cible</label>
        <SelectChips value={ia} onChange={setIa} options={IAS.map((v) => ({ value: v, label: v }))} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Projet</label>
        <TextInput value={projet} onChange={(e) => setProjet(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Titre</label>
        <TextInput value={titre} onChange={(e) => setTitre(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Notes (ce que tu veux dire)</label>
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Niveau</label>
        <SelectChips
          value={niveau}
          onChange={setNiveau}
          options={[
            { value: "rapide", label: "Rapide" },
            { value: "structure", label: "Structuré" },
            { value: "complet", label: "Complet" },
            { value: "expert", label: "Expert" },
          ]}
        />
      </div>

      <ActionButton variant={redaction ? "loading" : "primary"} disabled={redaction} onClick={genererBrouillon}>
        Générer un brouillon
      </ActionButton>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Texte du prompt</label>
        <TextArea rows={5} value={texte} onChange={(e) => setTexte(e.target.value)} />
      </div>

      <ActionButton variant={envoi ? "loading" : "success"} disabled={envoi} onClick={soumettre}>
        Enregistrer le prompt
      </ActionButton>
    </div>
  );
}
