"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ActionButton } from "@/components/ActionButton";
import { SpinnerIcon } from "@/components/icons";
import { LIBELLE_MOTEUR } from "@/shared/veille/types";
import { useChrono, formaterDuree } from "./useChrono";
import type { SujetResumeDTO } from "@/shared/veille/types";

export function SujetsManager() {
  const [sujets, setSujets] = useState<SujetResumeDTO[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);

  const rafraichir = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await fetch("/api/veille/sujets");
      const donnees = await reponse.json();
      if (donnees.ok) setSujets(donnees.sujets);
      else setErreur(donnees.erreurs?.[0] ?? "Erreur inconnue.");
    } catch {
      setErreur("Impossible de contacter le serveur.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  async function changerEtat(id: string, action: "suspendre" | "reactiver") {
    setEnCours(id);
    await fetch(`/api/veille/sujets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setEnCours(null);
    rafraichir();
  }

  async function supprimer(id: string, nom: string) {
    if (!window.confirm(`Supprimer définitivement le sujet « ${nom} » et tout son historique de veille ?`)) return;
    setEnCours(id);
    await fetch(`/api/veille/sujets/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: true }),
    });
    setEnCours(null);
    rafraichir();
  }

  async function lancerMaintenant(id: string) {
    setEnCours(id);
    await fetch(`/api/veille/sujets/${id}/run`, { method: "POST" });
    setEnCours(null);
    rafraichir();
  }

  return (
    <div>
      <div className="mb-4">
        <Link href="/agents/veille/sujets/nouveau">
          <ActionButton>Nouveau sujet</ActionButton>
        </Link>
      </div>

      {erreur && (
        <p className="mb-3 rounded-lg border border-[var(--critical)] bg-[#FDECEB] px-3 py-2 text-sm text-[var(--critical)]">
          {erreur}
        </p>
      )}
      {chargement && <p className="text-sm text-[var(--ink-soft)]">Chargement…</p>}
      {!chargement && sujets.length === 0 && !erreur && (
        <p className="text-sm text-[var(--ink-soft)]">Aucun sujet de veille pour le moment.</p>
      )}

      <ul className="flex flex-col gap-2.5">
        {sujets.map((s) => (
          <SujetRow
            key={s.id}
            sujet={s}
            enCours={enCours === s.id}
            onLancerMaintenant={() => lancerMaintenant(s.id)}
            onChangerEtat={(action) => changerEtat(s.id, action)}
            onSupprimer={() => supprimer(s.id, s.nom)}
          />
        ))}
      </ul>
    </div>
  );
}

function SujetRow({
  sujet: s,
  enCours,
  onLancerMaintenant,
  onChangerEtat,
  onSupprimer,
}: {
  sujet: SujetResumeDTO;
  enCours: boolean;
  onLancerMaintenant: () => void;
  onChangerEtat: (action: "suspendre" | "reactiver") => void;
  onSupprimer: () => void;
}) {
  const secondesLancement = useChrono(enCours);

  return (
    <li className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/agents/veille/sujets/${s.id}`} className="text-sm font-semibold text-[var(--ink)] hover:underline">
            {s.nom}
          </Link>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-[var(--font-ibm-plex-mono)] text-[11px] text-[var(--ink-soft)]">
            <span>{s.etat === "actif" ? "Actif" : "Suspendu"}</span>
            <span>Dialogue : {LIBELLE_MOTEUR[s.moteurDialogue]}</span>
            <span>Analyse : {LIBELLE_MOTEUR[s.moteurAnalyse]}</span>
            <span>{s.nbSourcesValidees} source(s)</span>
            <span>
              Dernière réussite :{" "}
              {s.derniereExecutionReussieAt ? new Date(s.derniereExecutionReussieAt).toLocaleString("fr-FR") : "jamais"}
            </span>
          </div>
        </div>
        <div className="flex flex-none flex-wrap gap-1.5">
          <ActionButton
            variant={enCours ? "loading" : "ghost"}
            icon={enCours ? <SpinnerIcon /> : undefined}
            disabled={enCours || s.etat !== "actif"}
            onClick={onLancerMaintenant}
          >
            {enCours ? `En cours… (${formaterDuree(secondesLancement)})` : "Lancer maintenant"}
          </ActionButton>
          {s.etat === "actif" ? (
            <ActionButton variant="ghost" disabled={enCours} onClick={() => onChangerEtat("suspendre")}>
              Suspendre
            </ActionButton>
          ) : (
            <ActionButton variant="ghost" disabled={enCours} onClick={() => onChangerEtat("reactiver")}>
              Réactiver
            </ActionButton>
          )}
          <ActionButton variant="ghost" disabled={enCours} onClick={onSupprimer}>
            Supprimer
          </ActionButton>
        </div>
      </div>
    </li>
  );
}
