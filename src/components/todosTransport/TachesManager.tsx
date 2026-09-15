"use client";

import { useCallback, useEffect, useState } from "react";
import { TextArea } from "@/components/form/TextInput";
import { DownloadIcon } from "@/components/icons";
import { RdvForm } from "./RdvForm";
import { EmailForm } from "./EmailForm";
import { PromptForm } from "./PromptForm";

export type TypeTache = "rdv" | "email" | "prompt";

export type Tache = {
  id: string;
  type: TypeTache;
  titre: string;
  statut: "active" | "archivee";
  creeLe: string;
  rdvDateDebut?: string | null;
  rdvDureeMinutes?: number | null;
  rdvAlerteMinutes?: number | null;
  rdvDescription?: string | null;
  emailDestinataire?: string | null;
  emailTexte?: string | null;
  promptIa?: string | null;
  promptProjet?: string | null;
  promptTexte?: string | null;
};

const ONGLET_CLASSES = (actif: boolean) =>
  "rounded-full border-[1.5px] px-[15px] py-[6.5px] text-[12.5px] font-semibold " +
  (actif
    ? "border-[var(--orange)] bg-[var(--orange)] text-white"
    : "border-[var(--line)] bg-white text-[#5C4F49]");

const LIBELLE_TYPE: Record<TypeTache, string> = { rdv: "RDV", email: "Email", prompt: "Prompt" };

export function TachesManager() {
  const [taches, setTaches] = useState<Tache[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [type, setType] = useState<TypeTache>("rdv");

  const rafraichir = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await fetch("/api/agents/todos-transport/taches?statut=active");
      const donnees = await reponse.json();
      if (donnees.ok) {
        setTaches(donnees.taches);
      } else {
        setErreur(donnees.erreurs?.[0] ?? "Erreur inconnue.");
      }
    } catch {
      setErreur("Impossible de contacter le serveur.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    rafraichir();
  }, [rafraichir]);

  async function marquerTraite(id: string) {
    await fetch(`/api/agents/todos-transport/taches/${id}/traiter`, { method: "POST" });
    rafraichir();
  }

  return (
    <div className="mt-2 grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <div className="mb-3.5 flex flex-wrap gap-2">
          {(["rdv", "email", "prompt"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} className={ONGLET_CLASSES(type === t)}>
              {LIBELLE_TYPE[t]}
            </button>
          ))}
        </div>

        {type === "rdv" && <RdvForm onCree={rafraichir} />}
        {type === "email" && <EmailForm onCree={rafraichir} />}
        {type === "prompt" && <PromptForm onCree={rafraichir} />}
      </div>

      <div>
        <div className="mb-3.5 text-xs font-semibold text-[var(--ink-soft)]">
          Tâches actives {!chargement && `(${taches.length})`}
        </div>

        {erreur && (
          <p className="mb-3 rounded-lg border border-[var(--critical)] bg-white px-3 py-2 text-sm text-[var(--critical)]">
            {erreur}
          </p>
        )}

        {chargement && <p className="text-sm text-[var(--ink-soft)]">Chargement…</p>}

        {!chargement && taches.length === 0 && !erreur && (
          <p className="text-sm text-[var(--ink-soft)]">Aucune tâche active pour le moment.</p>
        )}

        <ul className="flex flex-col gap-2.5">
          {taches.map((tache) => (
            <li
              key={tache.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="mr-2 rounded-full bg-[var(--util-bg)] px-2 py-0.5 font-[var(--font-ibm-plex-mono)] text-[10px] font-semibold uppercase text-[var(--util-ink)]">
                    {LIBELLE_TYPE[tache.type]}
                  </span>
                  <span className="text-sm font-semibold text-[var(--ink)]">{tache.titre}</span>
                  {tache.type === "rdv" && tache.rdvDateDebut && (
                    <div className="mt-1 font-[var(--font-ibm-plex-mono)] text-[11px] text-[var(--ink-soft)]">
                      {new Date(tache.rdvDateDebut).toLocaleString("fr-FR")}
                    </div>
                  )}
                  {tache.type === "email" && (
                    <div className="mt-1 text-xs text-[var(--ink-soft)]">À : {tache.emailDestinataire}</div>
                  )}
                  {tache.type === "prompt" && (
                    <div className="mt-1 text-xs text-[var(--ink-soft)]">
                      {tache.promptIa} · {tache.promptProjet}
                    </div>
                  )}
                </div>
                <div className="flex flex-none gap-1.5">
                  {tache.type === "rdv" && (
                    <a
                      href={`/api/agents/todos-transport/taches/${tache.id}/ics`}
                      className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[var(--util-bg)] text-[var(--util-ink)]"
                      title="Télécharger le .ics"
                    >
                      <DownloadIcon />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => marquerTraite(tache.id)}
                    className="rounded-[9px] bg-[var(--good)] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Traité
                  </button>
                </div>
              </div>
              {tache.type === "email" && tache.emailTexte && (
                <div className="mt-2.5">
                  <TextArea readOnly value={tache.emailTexte} rows={3} />
                </div>
              )}
              {tache.type === "prompt" && tache.promptTexte && (
                <div className="mt-2.5">
                  <TextArea readOnly value={tache.promptTexte} rows={3} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
