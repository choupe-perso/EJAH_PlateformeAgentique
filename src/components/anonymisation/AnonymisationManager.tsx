"use client";

import { useRef, useState } from "react";
import { ActionButton } from "@/components/ActionButton";
import type { SpanAnonymisation } from "@/shared/anonymisationSpan";

const FORMATS_ACCEPTES = ".txt,.docx,.pptx,.xlsx,.pdf";
const EXTENSIONS_RESTAURABLES = [".txt", ".docx", ".pptx", ".xlsx"];

function estRestaurable(nom: string): boolean {
  const nomBas = nom.toLowerCase();
  return EXTENSIONS_RESTAURABLES.some((ext) => nomBas.endsWith(ext));
}

function telechargerReponse(blob: Blob, nomParDefaut: string, entete: Headers) {
  const dispositionEntete = entete.get("Content-Disposition") ?? "";
  const correspondance = /filename="([^"]+)"/.exec(dispositionEntete);
  const nomFichier = correspondance?.[1] ?? nomParDefaut;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AnonymisationManager() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fichier, setFichier] = useState<File | null>(null);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [spans, setSpans] = useState<SpanAnonymisation[] | null>(null);

  const [inspection, setInspection] = useState(false);
  const [anonymisation, setAnonymisation] = useState(false);
  const [restauration, setRestauration] = useState(false);

  const enCours = inspection || anonymisation || restauration;
  const rienAReinitialiser = !fichier && erreurs.length === 0 && spans === null;

  function choisirFichier(e: React.ChangeEvent<HTMLInputElement>) {
    setFichier(e.target.files?.[0] ?? null);
    setErreurs([]);
    setSpans(null);
  }

  function reinitialiser() {
    setFichier(null);
    setErreurs([]);
    setSpans(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function inspecter() {
    if (!fichier) return;
    setInspection(true);
    setErreurs([]);
    setSpans(null);
    try {
      const corps = new FormData();
      corps.append("fichier", fichier);
      const reponse = await fetch("/api/agents/anonymisation/inspecter", { method: "POST", body: corps });
      const donnees = await reponse.json();
      if (!donnees.ok) {
        setErreurs(donnees.erreurs ?? ["Erreur inconnue."]);
        return;
      }
      setSpans(donnees.spans);
    } finally {
      setInspection(false);
    }
  }

  async function anonymiser() {
    if (!fichier) return;
    setAnonymisation(true);
    setErreurs([]);
    try {
      const corps = new FormData();
      corps.append("fichier", fichier);
      const reponse = await fetch("/api/agents/anonymisation/anonymiser", { method: "POST", body: corps });
      if (!reponse.ok || reponse.headers.get("Content-Type") === "application/json") {
        const donnees = await reponse.json().catch(() => ({}));
        setErreurs(donnees.erreurs ?? ["Erreur inconnue."]);
        return;
      }
      const blob = await reponse.blob();
      telechargerReponse(blob, `anonymise_${fichier.name}`, reponse.headers);
    } finally {
      setAnonymisation(false);
    }
  }

  async function restaurer() {
    if (!fichier) return;
    setRestauration(true);
    setErreurs([]);
    try {
      const corps = new FormData();
      corps.append("fichier", fichier);
      const reponse = await fetch("/api/agents/anonymisation/restaurer", { method: "POST", body: corps });
      if (!reponse.ok || reponse.headers.get("Content-Type") === "application/json") {
        const donnees = await reponse.json().catch(() => ({}));
        setErreurs(donnees.erreurs ?? ["Erreur inconnue."]);
        return;
      }
      const blob = await reponse.blob();
      telechargerReponse(blob, `restaure_${fichier.name}`, reponse.headers);
    } finally {
      setRestauration(false);
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
        <div className="mb-3 text-xs font-semibold text-[var(--ink-soft)]">Document a traiter</div>
        <p className="mb-3 text-xs text-[var(--ink-soft)]">
          Traitement entierement local (regex, dictionnaires, NER, OCR des images embarquées) - aucune
          donnee n&apos;est envoyee sur internet. Formats acceptes : .txt, .docx, .pptx, .xlsx, .pdf.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={FORMATS_ACCEPTES}
          onChange={choisirFichier}
          className="mb-3 block w-full text-sm text-[var(--ink)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--util-bg)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[var(--util-ink)]"
        />

        <div className="flex flex-wrap gap-2">
          <ActionButton
            variant={inspection ? "loading" : "primary"}
            disabled={enCours || !fichier}
            onClick={inspecter}
          >
            Inspecter
          </ActionButton>
          <ActionButton
            variant={anonymisation ? "loading" : "success"}
            disabled={enCours || !fichier}
            onClick={anonymiser}
          >
            Anonymiser
          </ActionButton>
          <ActionButton
            variant={restauration ? "loading" : "primary"}
            disabled={enCours || !fichier || !estRestaurable(fichier.name)}
            onClick={restaurer}
          >
            Restaurer
          </ActionButton>
          <ActionButton variant="ghost" disabled={enCours || rienAReinitialiser} onClick={reinitialiser}>
            Réinitialiser
          </ActionButton>
        </div>
        {fichier && !estRestaurable(fichier.name) && (
          <p className="mt-2 text-xs text-[var(--ink-soft)]">
            La restauration automatique n&apos;est pas disponible pour les fichiers .pdf (convertis en
            .docx - restaure ce .docx une fois anonymisé).
          </p>
        )}
      </div>

      {spans && (
        <div>
          <div className="mb-2.5 text-xs font-semibold text-[var(--ink-soft)]">
            {spans.length > 0 ? `Entités détectées (${spans.length})` : "Aucune entité détectée"}
          </div>
          {spans.length > 0 && (
            <ul className="flex flex-col gap-2">
              {spans.map((s, i) => (
                <li
                  key={`${s.start}-${s.end}-${i}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3"
                >
                  <span className="flex-none rounded-full bg-[var(--util-bg)] px-2 py-0.5 font-[var(--font-ibm-plex-mono)] text-[10px] font-semibold uppercase tracking-wide text-[var(--util-ink)]">
                    {s.entityType}
                  </span>
                  <span className="min-w-0 truncate text-sm text-[var(--ink)]">{s.text}</span>
                  <span className="ml-auto flex-none font-[var(--font-ibm-plex-mono)] text-[11px] text-[var(--ink-soft)]">
                    {Math.round(s.score * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
