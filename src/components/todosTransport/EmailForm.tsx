"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ActionButton";
import { Field } from "@/components/form/Field";
import { TextInput, TextArea } from "@/components/form/TextInput";
import { SelectChips } from "./SelectChips";
import { useMinuteur } from "./useMinuteur";
import type { LongueurMail, Registre, Ton } from "@/integrations/ollama/redactionTransport";

export function EmailForm({ onCree }: { onCree: () => void }) {
  const [destinataire, setDestinataire] = useState("");
  const [notes, setNotes] = useState("");
  const [registre, setRegistre] = useState<Registre>("tutoiement");
  const [ton, setTon] = useState<Ton>("professionnel");
  const [longueur, setLongueur] = useState<LongueurMail>("court");
  const [titre, setTitre] = useState("");
  const [texte, setTexte] = useState("");
  const [champsGeneresModifiables, setChampsGeneresModifiables] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [redaction, setRedaction] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const enCours = redaction || envoi;
  const dureeGeneration = useMinuteur(redaction);

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
      setChampsGeneresModifiables(false);
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
      setChampsGeneresModifiables(false);
      onCree();
    } finally {
      setEnvoi(false);
    }
  }

  const champsGeneres = titre.trim() !== "" || texte.trim() !== "";
  const familleGeneree = champsGeneresModifiables ? "user" : "platform";

  return (
    <div className="flex flex-col gap-3.5">
      {erreurs.length > 0 && (
        <ul className="rounded-lg border border-[var(--critical)] bg-white px-3 py-2 text-sm text-[var(--critical)]">
          {erreurs.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <Field label="Destinataire" family="user">
        <TextInput
          value={destinataire}
          onChange={(e) => setDestinataire(e.target.value)}
          placeholder="Ex : le client, Marc…"
        />
      </Field>

      <Field label="Notes (ce que tu veux dire)" family="user">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <Field label="Registre" family="user">
        <SelectChips
          value={registre}
          onChange={setRegistre}
          options={[
            { value: "tutoiement", label: "Tutoiement" },
            { value: "vouvoiement", label: "Vouvoiement" },
          ]}
        />
      </Field>

      <Field label="Ton" family="user">
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
      </Field>

      <Field label="Longueur" family="user">
        <SelectChips
          value={longueur}
          onChange={setLongueur}
          options={[
            { value: "tres_court", label: "Très court" },
            { value: "court", label: "Court" },
            { value: "developpe", label: "Développé" },
          ]}
        />
      </Field>

      <ActionButton
        variant={redaction ? "loading" : "primary"}
        disabled={enCours}
        onClick={genererBrouillon}
      >
        {redaction ? `Génération en cours… (${dureeGeneration})` : "Générer un brouillon"}
      </ActionButton>

      <Field label="Titre" family={familleGeneree} texteACopier={champsGeneres ? titre : undefined}>
        <TextInput
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          readOnly={!champsGeneresModifiables}
        />
      </Field>

      <Field label="Texte" family={familleGeneree} texteACopier={champsGeneres ? texte : undefined}>
        <TextArea
          rows={5}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          readOnly={!champsGeneresModifiables}
        />
      </Field>

      {champsGeneres && !champsGeneresModifiables && (
        <ActionButton variant="ghost" disabled={enCours} onClick={() => setChampsGeneresModifiables(true)}>
          Recopier les champs dans espace utilisateur
        </ActionButton>
      )}

      <ActionButton variant={envoi ? "loading" : "success"} disabled={enCours} onClick={soumettre}>
        Enregistrer l&apos;email
      </ActionButton>
    </div>
  );
}
