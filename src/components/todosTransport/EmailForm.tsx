"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ActionButton";
import { TextInput, TextArea } from "@/components/form/TextInput";
import { SelectChips } from "./SelectChips";
import type { LongueurMail, Registre, Ton } from "@/integrations/ollama/redactionTransport";

export function EmailForm({ onCree }: { onCree: () => void }) {
  const [destinataire, setDestinataire] = useState("");
  const [notes, setNotes] = useState("");
  const [registre, setRegistre] = useState<Registre>("tutoiement");
  const [ton, setTon] = useState<Ton>("professionnel");
  const [longueur, setLongueur] = useState<LongueurMail>("court");
  const [titre, setTitre] = useState("");
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
        body: JSON.stringify({ type: "email", destinataire, notes, registre, ton, longueur }),
      });
      const donnees = await reponse.json();
      if (!donnees.ok) {
        setErreurs(donnees.erreurs ?? ["Erreur inconnue."]);
        return;
      }
      setTitre(donnees.titre);
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
        body: JSON.stringify({ type: "email", titre, destinataire, texte, notesBrutes: notes }),
      });
      const donnees = await reponse.json();
      if (!donnees.ok) {
        setErreurs(donnees.erreurs ?? ["Erreur inconnue."]);
        return;
      }
      setDestinataire("");
      setNotes("");
      setTitre("");
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
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Destinataire</label>
        <TextInput
          value={destinataire}
          onChange={(e) => setDestinataire(e.target.value)}
          placeholder="Ex : le client, Marc…"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Notes (ce que tu veux dire)</label>
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Registre</label>
        <SelectChips
          value={registre}
          onChange={setRegistre}
          options={[
            { value: "tutoiement", label: "Tutoiement" },
            { value: "vouvoiement", label: "Vouvoiement" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Ton</label>
        <SelectChips
          value={ton}
          onChange={setTon}
          options={[
            { value: "formel", label: "Formel" },
            { value: "professionnel", label: "Professionnel" },
            { value: "proche", label: "Proche" },
            { value: "amical", label: "Amical" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Longueur</label>
        <SelectChips
          value={longueur}
          onChange={setLongueur}
          options={[
            { value: "tres_court", label: "Très court" },
            { value: "court", label: "Court" },
            { value: "developpe", label: "Développé" },
          ]}
        />
      </div>

      <ActionButton
        variant={redaction ? "loading" : "primary"}
        disabled={redaction}
        onClick={genererBrouillon}
      >
        Générer un brouillon
      </ActionButton>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Titre</label>
        <TextInput value={titre} onChange={(e) => setTitre(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-[var(--ink-soft)]">Texte</label>
        <TextArea rows={5} value={texte} onChange={(e) => setTexte(e.target.value)} />
      </div>

      <ActionButton variant={envoi ? "loading" : "success"} disabled={envoi} onClick={soumettre}>
        Enregistrer l&apos;email
      </ActionButton>
    </div>
  );
}
