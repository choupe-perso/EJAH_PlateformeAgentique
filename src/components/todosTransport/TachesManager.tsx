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
  traiteLe?: string | null;
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

function formaterDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR");
}

function DetailTache({ tache }: { tache: Tache }) {
  return (
    <>
      {tache.type === "rdv" && tache.rdvDateDebut && (
        <div className="mt-1 font-[var(--font-ibm-plex-mono)] text-[11px] text-[var(--ink-soft)]">
          {formaterDate(tache.rdvDateDebut)}
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
    </>
  );
}

export function TachesManager() {
  const [taches, setTaches] = useState<Tache[]>([]);
  const [tachesTraitees, setTachesTraitees] = useState<Tache[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [type, setType] = useState<TypeTache>("rdv");

  const rafraichir = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const [reponseActives, reponseTraitees] = await Promise.all([
        fetch("/api/agents/todos-transport/taches?statut=active"),
        fetch("/api/agents/todos-transport/taches?statut=archivee"),
      ]);
      const [donneesActives, donneesTraitees] = await Promise.all([
        reponseActives.json(),
        reponseTraitees.json(),
      ]);
      if (donneesActives.ok) {
        setTaches(donneesActives.taches);
      } else {
        setErreur(donneesActives.erreurs?.[0] ?? "Erreur inconnue.");
      }
      if (donneesTraitees.ok) {
        const triees = [...donneesTraitees.taches].sort((a: Tache, b: Tache) => {
          const dateA = a.traiteLe ? new Date(a.traiteLe).getTime() : 0;
          const dateB = b.traiteLe ? new Date(b.traiteLe).getTime() : 0;
          return dateB - dateA;
        });
        setTachesTraitees(triees);
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
                  <div className="mt-1 font-[var(--font-ibm-plex-mono)] text-[10px] text-[var(--ink-soft)]">
                    Créée le {formaterDate(tache.creeLe)}
                  </div>
                  <DetailTache tache={tache} />
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

        <details className="mt-5">
          <summary className="cursor-pointer text-xs font-semibold text-[var(--ink-soft)]">
            Tâches traitées {!chargement && `(${tachesTraitees.length})`}
          </summary>

          {!chargement && tachesTraitees.length === 0 && (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">Aucune tâche traitée pour le moment.</p>
          )}

          <ul className="mt-3 flex flex-col gap-2.5">
            {tachesTraitees.map((tache) => (
              <li
                key={tache.id}
                className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 opacity-80"
              >
                <span className="mr-2 rounded-full bg-[var(--util-bg)] px-2 py-0.5 font-[var(--font-ibm-plex-mono)] text-[10px] font-semibold uppercase text-[var(--util-ink)]">
                  {LIBELLE_TYPE[tache.type]}
                </span>
                <span className="text-sm font-semibold text-[var(--ink)]">{tache.titre}</span>
                {tache.traiteLe && (
                  <div className="mt-1 font-[var(--font-ibm-plex-mono)] text-[10px] text-[var(--ink-soft)]">
                    Traitée le {formaterDate(tache.traiteLe)}
                  </div>
                )}
                <DetailTache tache={tache} />
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
