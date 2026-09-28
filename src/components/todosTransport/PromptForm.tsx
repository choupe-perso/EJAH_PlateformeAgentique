"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ActionButton";
import { Field } from "@/components/form/Field";
import { TextInput, TextArea } from "@/components/form/TextInput";
import { SelectChips } from "./SelectChips";
import { useMinuteur } from "./useMinuteur";
import type { NiveauPrompt } from "@/core/agents/taches";

const IAS = ["chatgpt", "copilot", "gemini", "claude"] as const;

type ActionIa = "aucune" | "ameliorer" | "generer";

// Consigne fixe envoyee au coeur pour le mode "Ameliorer" (voir
// python/agents/taches/app/integrations/ollama/redaction.py::reecrire_prompt) -
// pas de champ libre expose ici, le mode lui-meme porte l'intention.
const PRECISIONS_AMELIORATION =
  "Corrige les fautes et ameliore la fluidite des phrases et de la syntaxe. Ne change ni le fond, ni le sens, ni les informations.";

export function PromptForm({ onCree }: { onCree: () => void }) {
  const [ia, setIa] = useState<(typeof IAS)[number]>("claude");
  const [projet, setProjet] = useState("");
  const [titre, setTitre] = useState("");
  const [notes, setNotes] = useState("");
  const [niveau, setNiveau] = useState<NiveauPrompt>("structure");
  const [action, setAction] = useState<ActionIa>("generer");
  const [texte, setTexte] = useState("");
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [redaction, setRedaction] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const enCours = redaction || envoi;
  const dureeGeneration = useMinuteur(redaction);

  async function lancerIa() {
    if (action === "ameliorer" && !texte.trim()) {
      setErreurs(["Il n'y a rien à améliorer : renseigne d'abord le champ Texte du prompt (plateforme)."]);
      return;
    }
    setRedaction(true);
    setErreurs([]);
    try {
      const corps =
        action === "ameliorer"
          ? { type: "prompt", ia, projet, titre, texteActuel: texte, precisions: PRECISIONS_AMELIORATION, niveau }
          : { type: "prompt", ia, projet, titre, notes, niveau };
      const reponse = await fetch("/api/agents/taches/brouillon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
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
      const reponse = await fetch("/api/agents/taches/items", {
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

  const champsGeneres = texte.trim() !== "";

  return (
    <div className="flex flex-col gap-3.5">
      {erreurs.length > 0 && (
        <ul className="rounded-lg border border-[var(--critical)] bg-white px-3 py-2 text-sm text-[var(--critical)]">
          {erreurs.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <Field label="IA cible" family="user">
        <SelectChips value={ia} onChange={setIa} options={IAS.map((v) => ({ value: v, label: v }))} />
      </Field>

      <Field label="Projet" family="user">
        <TextInput value={projet} onChange={(e) => setProjet(e.target.value)} />
      </Field>

      <Field label="Titre" family="user" texteACopier={titre.trim() !== "" ? titre : undefined}>
        <TextInput value={titre} onChange={(e) => setTitre(e.target.value)} />
      </Field>

      <Field label="Notes (ce que tu veux dire)" family="user">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <Field label="Niveau" family="user">
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
      </Field>

      <Field label="Action IA" family="user">
        <SelectChips
          value={action}
          onChange={setAction}
          options={[
            { value: "aucune", label: "Aucune" },
            { value: "ameliorer", label: "Améliorer" },
            { value: "generer", label: "Générer" },
          ]}
        />
      </Field>

      {action !== "aucune" && (
        <ActionButton variant={redaction ? "loading" : "primary"} disabled={enCours} onClick={lancerIa}>
          {redaction
            ? `Génération en cours… (${dureeGeneration})`
            : action === "ameliorer"
              ? "Améliorer le brouillon"
              : "Générer un brouillon"}
        </ActionButton>
      )}

      <Field label="Texte du prompt" family="platform" texteACopier={champsGeneres ? texte : undefined}>
        <TextArea rows={5} value={texte} onChange={(e) => setTexte(e.target.value)} />
      </Field>

      {champsGeneres && (
        <ActionButton variant="ghost" disabled={enCours} onClick={() => setNotes(texte)}>
          Recopier les champs dans espace utilisateur
        </ActionButton>
      )}

      <ActionButton variant={envoi ? "loading" : "success"} disabled={enCours} onClick={soumettre}>
        Enregistrer le prompt
      </ActionButton>
    </div>
  );
}
