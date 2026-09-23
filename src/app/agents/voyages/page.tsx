"use client";

import { useEffect, useRef, useState } from "react";
import { AgentsSidebar } from "@/components/AgentsSidebar";
import { SectionHead } from "@/components/SectionHead";
import { ActionButton } from "@/components/ActionButton";
import { TextInput } from "@/components/form/TextInput";
import { SpinnerIcon, DownloadIcon, ErrorIcon, CopyIcon, CheckIcon } from "@/components/icons";
import { TARGET_URL, type RecupererPhase, type Voyage } from "@/shared/voyages";

interface AgentSummary {
  id: string;
  name: string;
  description: string;
}

function formatDate(v: Voyage): string {
  const j = String(v.jour).padStart(2, "0");
  const m = String(v.mois).padStart(2, "0");
  return `${j}/${m}/${v.annee}`;
}

function formatHeure(h: [number, number]): string {
  return `${String(h[0]).padStart(2, "0")}h${String(h[1]).padStart(2, "0")}`;
}

function voyageKey(v: Voyage): string {
  return v.id;
}

type StepState = "pending" | "active" | "done" | "error";

type TrackedPhase = Exclude<RecupererPhase, "idle">;

const STEP_ORDER: TrackedPhase[] = ["authentification", "scraping"];
const STEP_LABELS: Record<TrackedPhase, string> = {
  authentification: "En attente de la page des voyages",
  scraping: "Récupération des voyages en cours",
};

/** États des 2 étapes de suivi ("authentification", "scraping"), déduits du
 * dernier état de progression connu (phase) - conservé même après la fin de
 * l'appel (succès ou erreur) pour montrer où l'opération en était rendue. */
function computeStepStates(
  recuperating: boolean,
  phase: RecupererPhase,
  voyages: Voyage[] | null,
  error: string | null
): [StepState, StepState] {
  if (!recuperating && voyages === null && !error) {
    return ["pending", "pending"];
  }
  const currentIdx = phase === "idle" ? 0 : STEP_ORDER.indexOf(phase);
  return STEP_ORDER.map((_, idx): StepState => {
    if (error) {
      if (idx < currentIdx) return "done";
      if (idx === currentIdx) return "error";
      return "pending";
    }
    if (voyages !== null) return "done";
    if (idx < currentIdx) return "done";
    if (idx === currentIdx) return recuperating ? "active" : "pending";
    return "pending";
  }) as [StepState, StepState];
}

const STEP_VARIANT: Record<StepState, "pending" | "loading" | "success" | "error"> = {
  pending: "pending",
  active: "loading",
  done: "success",
  error: "error",
};

export default function VoyagesPage() {
  const [agent, setAgent] = useState<AgentSummary | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  const [recuperating, setRecuperating] = useState(false);
  const [phase, setPhase] = useState<RecupererPhase>("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recupererError, setRecupererError] = useState<string | null>(null);
  const [voyages, setVoyages] = useState<Voyage[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [generating, setGenerating] = useState(false);
  const [genererError, setGenererError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents/voyages")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Gateway indisponible.");
        setAgent(body);
      })
      .catch((e) => setAgentError(e instanceof Error ? e.message : "Erreur inconnue"));
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(TARGET_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Presse-papier indisponible (permission navigateur) - rien à faire,
      // le champ reste sélectionnable/copiable manuellement.
    }
  }

  function handleOpen() {
    window.open(TARGET_URL, "_blank", "noopener,noreferrer");
  }

  async function handleRecuperer() {
    setRecupererError(null);
    setVoyages(null);
    setRecuperating(true);
    setPhase("idle");

    pollRef.current = setInterval(async () => {
      const res = await fetch("/api/agents/voyages/progress");
      const body = await res.json();
      if (body.phase) setPhase(body.phase);
    }, 1500);

    try {
      const res = await fetch("/api/agents/voyages/recuperer", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Échec de la récupération.");
      if (body.error) throw new Error(body.error);
      setVoyages(body.voyages ?? []);
      setSelected(new Set((body.voyages ?? []).map(voyageKey)));
    } catch (e) {
      setRecupererError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      // phase n'est pas remis à "idle" ici : sa dernière valeur connue reste
      // affichée (étape atteinte en cas de succès, étape en échec sinon).
      setRecuperating(false);
    }
  }

  function toggleSelected(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleGenerer() {
    if (!voyages) return;
    const choisis = voyages.filter((v) => selected.has(voyageKey(v)));
    if (choisis.length === 0) {
      setGenererError("Sélectionnez au moins un voyage.");
      return;
    }
    setGenererError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/agents/voyages/generer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voyages: choisis }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Échec de la génération.");
      if (body.error) throw new Error(body.error);
      const blob = new Blob([body.icsContenu as string], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "voyages_sncf.ics";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setGenererError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex items-start">
      <AgentsSidebar />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7">
        <SectionHead eyebrow="Perso · Voyages" title="Calendrier des voyages SNCF" />

        {agentError && (
          <p className="mb-4 max-w-2xl rounded-xl border-[1.5px] border-[var(--critical)] bg-white px-4 py-3 text-sm text-[var(--critical)]">
            {agentError} — la gateway Python est-elle démarrée (port 9010) ?
          </p>
        )}

        {agent && (
          <>
            <p className="mb-5 max-w-2xl text-sm text-[var(--ink-soft)]">{agent.description}</p>

            {/* Page SNCF Connect - référence permanente */}
            <div className="mb-6 max-w-2xl rounded-2xl border-[1.5px] border-[var(--line)] bg-white p-4">
              <div className="mb-3 font-[var(--font-ibm-plex-mono)] text-[10.5px] uppercase tracking-[0.08em] text-[var(--violet-deep)]">
                Page SNCF Connect - voyages à venir
              </div>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <TextInput readOnly value={TARGET_URL} onFocus={(e) => e.target.select()} />
                </div>
                <div className="flex gap-2">
                  <ActionButton
                    variant={copied ? "success" : "primary"}
                    icon={copied ? <CheckIcon /> : <CopyIcon />}
                    onClick={handleCopy}
                  >
                    {copied ? "Copié" : "Copier"}
                  </ActionButton>
                  <ActionButton icon={<DownloadIcon />} onClick={handleOpen}>
                    Ouvrir
                  </ActionButton>
                </div>
              </div>
              <p className="mt-2.5 text-[12.5px] text-[var(--ink-soft)]">
                Ouvre cette page dans votre navigateur habituel, pour consulter ou vous connecter
                manuellement. Attention : la fenêtre Chrome ouverte par « Récupérer les voyages »
                ci-dessous est une session dédiée et séparée (profil Chrome propre à cet agent) -
                s&apos;y connecter la première fois reste nécessaire même si vous êtes déjà
                connecté ici.
              </p>
            </div>

            {/* Récupération */}
            <div className="mb-6 max-w-2xl rounded-2xl border-[1.5px] border-[var(--line)] bg-white p-4">
              <div className="mb-3 font-[var(--font-ibm-plex-mono)] text-[10.5px] uppercase tracking-[0.08em] text-[var(--violet-deep)]">
                Récupérer mes voyages à venir
              </div>
              <p className="mb-3 flex items-start gap-2 text-[13px] text-[var(--ink-soft)]">
                <ErrorIcon />
                <span>
                  Ouvre une fenêtre Chrome locale (profil dédié à cet agent). La première fois,
                  connectez-vous vous-même dans cette fenêtre - l&apos;opération peut bloquer
                  jusqu&apos;à 5 minutes en attendant. Restez devant votre écran.
                </span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                <ActionButton
                  variant={recuperating || voyages !== null ? "success" : "primary"}
                  disabled={recuperating}
                  icon={recuperating || voyages !== null ? <CheckIcon /> : undefined}
                  onClick={handleRecuperer}
                >
                  Récupérer les voyages
                </ActionButton>
                {computeStepStates(recuperating, phase, voyages, recupererError).map((state, idx) => {
                  const step = STEP_ORDER[idx];
                  const variant = STEP_VARIANT[state];
                  return (
                    <ActionButton
                      key={step}
                      variant={variant}
                      icon={
                        variant === "loading" ? (
                          <SpinnerIcon />
                        ) : variant === "success" ? (
                          <CheckIcon />
                        ) : variant === "error" ? (
                          <ErrorIcon />
                        ) : undefined
                      }
                    >
                      {STEP_LABELS[step]}
                    </ActionButton>
                  );
                })}
              </div>
              {recupererError && (
                <p className="mt-3 text-sm text-[var(--critical)]">{recupererError}</p>
              )}
            </div>

            {/* Liste + génération */}
            {voyages && (
              <div className="max-w-2xl rounded-2xl border-[1.5px] border-[var(--line)] bg-white p-4">
                <div className="mb-3 font-[var(--font-ibm-plex-mono)] text-[10.5px] uppercase tracking-[0.08em] text-[var(--violet-deep)]">
                  {voyages.length} voyage(s) trouvé(s)
                </div>

                {voyages.length === 0 ? (
                  <p className="text-[13px] text-[var(--ink-soft)]">Aucun voyage à venir.</p>
                ) : (
                  <>
                    <ul className="mb-4 flex flex-col gap-2">
                      {voyages.map((v) => (
                        <li
                          key={voyageKey(v)}
                          className="flex items-start gap-2.5 rounded-xl bg-[var(--canvas)] px-3 py-2 text-[13px]"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={selected.has(voyageKey(v))}
                            onChange={() => toggleSelected(voyageKey(v))}
                          />
                          <div>
                            <div className="font-medium">
                              {formatDate(v)} — {formatHeure(v.heure_depart)} →{" "}
                              {formatHeure(v.heure_arrivee)}
                            </div>
                            <div className="text-[var(--ink-soft)]">
                              {v.gare_depart} → {v.gare_arrivee} · {v.train_numero} ·{" "}
                              {v.duree} · dossier {v.dossier}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <ActionButton
                      variant={generating ? "loading" : "primary"}
                      disabled={generating || selected.size === 0}
                      icon={generating ? <SpinnerIcon /> : <DownloadIcon />}
                      onClick={handleGenerer}
                    >
                      {generating
                        ? "Génération…"
                        : `Générer le calendrier (.ics) — ${selected.size} sélectionné(s)`}
                    </ActionButton>
                    {genererError && (
                      <p className="mt-3 text-sm text-[var(--critical)]">{genererError}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
