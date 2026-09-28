"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ActionButton";
import { Field } from "@/components/form/Field";
import { TextInput, TextArea } from "@/components/form/TextInput";
import { SelectChips } from "./SelectChips";
import { useMinuteur } from "./useMinuteur";
import type { LongueurMail, Registre, Ton } from "@/core/agents/taches";

type ActionIa = "aucune" | "ameliorer" | "generer";

// Consigne fixe envoyee au coeur pour le mode "Ameliorer" (voir
// python/agents/taches/app/integrations/ollama/redaction.py::reecrire_email) -
// pas de champ libre expose ici, le mode lui-meme porte l'intention.
const PRECISIONS_AMELIORATION =
  "Corrige les fautes et ameliore la fluidite des phrases et de la syntaxe. Ne change ni le fond, ni le sens, ni les informations.";

export function EmailForm({ onCree }: { onCree: () => void }) {
  const [destinataire, setDestinataire] = useState("");
  const [notes, setNotes] = useState("");
  const [registre, setRegistre] = useState<Registre>("tutoiement");
  const [ton, setTon] = useState<Ton>("professionnel");
  const [longueur, setLongueur] = useState<LongueurMail>("court");
  const [action, setAction] = useState<ActionIa>("generer");
  const [titre, setTitre] = useState("");
  const [texte, setTexte] = useState("");
  const [titreUtilisateur, setTitreUtilisateur] = useState("");
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [redaction, setRedaction] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const enCours = redaction || envoi;
  const dureeGeneration = useMinuteur(redaction);

  async function lancerIa() {
    if (action === "ameliorer" && !texte.trim()) {
      setErreurs(["Il n'y a rien à améliorer : renseigne d'abord le champ Texte (plateforme)."]);
      return;
    }
    setRedaction(true);
    setErreurs([]);
    try {
      const corps =
        action === "ameliorer"
          ? {
              type: "email",
              destinataire,
              titreActuel: titreUtilisateur || titre,
              texteActuel: texte,
              precisions: PRECISIONS_AMELIORATION,
              registre,
              ton,
              longueur,
            }
          : { type: "email", destinataire, notes, registre, ton, longueur };
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
      const reponse = await fetch("/api/agents/taches/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          titre: titreUtilisateur || titre,
          destinataire,
          texte,
          notesBrutes: notes,
        }),
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
      setTitreUtilisateur("");
      onCree();
    } finally {
      setEnvoi(false);
    }
  }

  const champsGeneres = titre.trim() !== "" || texte.trim() !== "";

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

      <Field label="Titre" family="user">
        <TextInput
          value={titreUtilisateur}
          onChange={(e) => setTitreUtilisateur(e.target.value)}
          placeholder="Repris automatiquement du titre généré si laissé vide"
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
        <ActionButton
          variant={redaction ? "loading" : "primary"}
          disabled={enCours}
          onClick={lancerIa}
        >
          {redaction
            ? `Génération en cours… (${dureeGeneration})`
            : action === "ameliorer"
              ? "Améliorer le brouillon"
              : "Générer un brouillon"}
        </ActionButton>
      )}

      <Field label="Titre" family="platform" texteACopier={champsGeneres ? titre : undefined}>
        <TextInput value={titre} onChange={(e) => setTitre(e.target.value)} />
      </Field>

      <Field label="Texte" family="platform" texteACopier={champsGeneres ? texte : undefined}>
        <TextArea rows={5} value={texte} onChange={(e) => setTexte(e.target.value)} />
      </Field>

      {champsGeneres && (
        <ActionButton
          variant="ghost"
          disabled={enCours}
          onClick={() => {
            setNotes(texte);
            setTitreUtilisateur(titre);
          }}
        >
          Recopier les champs dans espace utilisateur
        </ActionButton>
      )}

      <ActionButton variant={envoi ? "loading" : "success"} disabled={enCours} onClick={soumettre}>
        Enregistrer l&apos;email
      </ActionButton>
    </div>
  );
}
