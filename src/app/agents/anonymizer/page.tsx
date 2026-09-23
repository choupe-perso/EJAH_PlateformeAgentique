"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AgentsSidebar } from "@/components/AgentsSidebar";
import { SectionHead } from "@/components/SectionHead";
import { ActionButton } from "@/components/ActionButton";
import { TextInput } from "@/components/form/TextInput";
import { SpinnerIcon } from "@/components/icons";

type Command = "inspect" | "anonymize" | "deanonymize";

interface AgentSummary {
  id: string;
  name: string;
  description: string;
  access_control?: { gate_question: string } | null;
  legal_disclaimer: string;
}

interface FileResult {
  input: string;
  entitiesCount?: number;
  error: string | null;
  downloadUrl?: string | null;
}

interface ExecuteResult {
  command: string;
  message: string;
  results: FileResult[];
  vaultDownloadUrl?: string | null;
}

const COMMAND_LABELS: Record<Command, string> = {
  inspect: "Inspecter (sans modifier)",
  anonymize: "Anonymiser",
  deanonymize: "Restaurer (déanonymiser)",
};

export default function AnonymizerPage() {
  const [agent, setAgent] = useState<AgentSummary | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);

  const [consentAdbi, setConsentAdbi] = useState(false);
  const [consentDisclaimer, setConsentDisclaimer] = useState(false);

  const [command, setCommand] = useState<Command>("inspect");
  const [passphrase, setPassphrase] = useState("");
  const [irreversible, setIrreversible] = useState(false);

  const documentsRef = useRef<HTMLInputElement>(null);
  const vaultRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExecuteResult | null>(null);

  useEffect(() => {
    fetch("/api/agents/anonymizer")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Gateway indisponible.");
        setAgent(body);
      })
      .catch((e) => setAgentError(e instanceof Error ? e.message : "Erreur inconnue"));
  }, []);

  const consentOk = consentAdbi && consentDisclaimer;
  const needsPassphrase = command === "deanonymize" || (command === "anonymize" && !irreversible);
  const needsVault = command === "deanonymize";

  function handleCommandChange(c: Command) {
    setCommand(c);
    setPassphrase("");
    setIrreversible(false);
    if (documentsRef.current) documentsRef.current.value = "";
    if (vaultRef.current) vaultRef.current.value = "";
    setError(null);
    setResult(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const documents = documentsRef.current?.files;
    if (!documents || documents.length === 0) {
      setError("Sélectionnez au moins un document.");
      return;
    }

    const form = new FormData();
    form.set("command", command);
    form.set("consent_adbi", String(consentAdbi));
    form.set("consent_disclaimer", String(consentDisclaimer));
    if (passphrase) form.set("passphrase", passphrase);
    if (command === "anonymize") form.set("irreversible", String(irreversible));
    for (const file of Array.from(documents)) form.append("documents", file);
    const vaultFile = vaultRef.current?.files?.[0];
    if (vaultFile) form.set("vault", vaultFile);

    setLoading(true);
    try {
      const res = await fetch("/api/agents/anonymizer/execute", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Échec de la requête.");
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-start">
      <AgentsSidebar />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7">
        <SectionHead eyebrow="Toolkit · Anonymisation" title="Anonymisation de documents" />

        {agentError && (
          <p className="mb-4 rounded-xl border-[1.5px] border-[var(--critical)] bg-white px-4 py-3 text-sm text-[var(--critical)]">
            {agentError} — la gateway Python est-elle démarrée (port 9010) ?
          </p>
        )}

        {agent && (
          <>
            <p className="mb-5 max-w-2xl text-sm text-[var(--ink-soft)]">{agent.description}</p>

            <div className="mb-6 max-w-2xl rounded-2xl border-[1.5px] border-[var(--line)] bg-white p-4">
              <div className="mb-3 font-[var(--font-ibm-plex-mono)] text-[10.5px] uppercase tracking-[0.08em] text-[var(--orange-deep)]">
                Avant de commencer
              </div>
              <label className="mb-2.5 flex items-start gap-2.5 text-[13px]">
                <input
                  type="checkbox"
                  checked={consentAdbi}
                  onChange={(e) => setConsentAdbi(e.target.checked)}
                  className="mt-0.5"
                />
                <span>{agent.access_control?.gate_question ?? "Êtes-vous autorisé(e) à utiliser cet agent ?"}</span>
              </label>
              <label className="flex items-start gap-2.5 text-[13px]">
                <input
                  type="checkbox"
                  checked={consentDisclaimer}
                  onChange={(e) => setConsentDisclaimer(e.target.checked)}
                  className="mt-0.5"
                />
                <span>{agent.legal_disclaimer}</span>
              </label>
            </div>

            <form onSubmit={handleSubmit} className="max-w-2xl">
            <fieldset disabled={!consentOk} className="disabled:opacity-40">
              <div className="mb-4 flex flex-wrap gap-2">
                {(Object.keys(COMMAND_LABELS) as Command[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCommandChange(c)}
                    className={
                      "rounded-full border-[1.5px] px-[15px] py-[6.5px] text-[12.5px] font-semibold " +
                      (command === c
                        ? "border-[var(--orange)] bg-[var(--orange)] text-white"
                        : "border-[var(--line)] bg-white text-[#5C4F49]")
                    }
                  >
                    {COMMAND_LABELS[c]}
                  </button>
                ))}
              </div>

              <div className="mb-4 flex flex-col gap-[7px]">
                <span className="text-xs font-semibold text-[var(--ink-soft)]">
                  Document(s) {command !== "deanonymize" ? "(.txt, .docx, .pptx, .xlsx, .pdf)" : "(fichier anonymisé)"}
                </span>
                <input
                  ref={documentsRef}
                  type="file"
                  multiple={command !== "deanonymize"}
                  accept=".txt,.docx,.pptx,.xlsx,.pdf"
                  className="text-[13px]"
                />
              </div>

              {needsVault && (
                <div className="mb-4 flex flex-col gap-[7px]">
                  <span className="text-xs font-semibold text-[var(--ink-soft)]">
                    Vault (fichier .vault.db)
                  </span>
                  <input ref={vaultRef} type="file" accept=".db" className="text-[13px]" />
                </div>
              )}
              {command === "anonymize" && !irreversible && (
                <div className="mb-4 flex flex-col gap-[7px]">
                  <span className="text-xs font-semibold text-[var(--ink-soft)]">
                    Vault existant (facultatif — laisser vide pour en créer un nouveau)
                  </span>
                  <input ref={vaultRef} type="file" accept=".db" className="text-[13px]" />
                </div>
              )}

              {needsPassphrase && (
                <div className="mb-4 flex flex-col gap-[7px]">
                  <span className="text-xs font-semibold text-[var(--ink-soft)]">Passphrase</span>
                  <TextInput
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Jamais stockée — à retenir pour restaurer plus tard"
                  />
                </div>
              )}

              {command === "anonymize" && (
                <label className="mb-4 flex items-center gap-2.5 text-[13px]">
                  <input
                    type="checkbox"
                    checked={irreversible}
                    onChange={(e) => setIrreversible(e.target.checked)}
                  />
                  Irréversible (aucun vault créé — les jetons ne pourront jamais être restaurés)
                </label>
              )}

              <ActionButton
                type="submit"
                variant={loading ? "loading" : "primary"}
                disabled={loading}
                icon={loading ? <SpinnerIcon /> : undefined}
              >
                {loading ? "Traitement en cours…" : "Lancer"}
              </ActionButton>
            </fieldset>
            </form>

            {error && (
              <p className="mt-4 max-w-2xl rounded-xl border-[1.5px] border-[var(--critical)] bg-white px-4 py-3 text-sm text-[var(--critical)]">
                {error}
              </p>
            )}

            {result && (
              <div className="mt-6 max-w-2xl rounded-2xl border-[1.5px] border-[var(--line)] bg-white p-4">
                <p className="mb-3 text-sm font-semibold">{result.message}</p>
                <ul className="flex flex-col gap-2">
                  {result.results.map((r, i) => (
                    <li key={i} className="rounded-xl bg-[var(--canvas)] px-3 py-2 text-[13px]">
                      <div className="font-medium">{r.input}</div>
                      {r.error ? (
                        <div className="text-[var(--critical)]">{r.error}</div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3 text-[var(--ink-soft)]">
                          {result.command !== "deanonymize" && r.entitiesCount !== undefined && (
                            <span>{r.entitiesCount} entité(s) détectée(s)</span>
                          )}
                          {result.command === "deanonymize" && <span>Restauré</span>}
                          {r.downloadUrl && (
                            <a
                              href={r.downloadUrl}
                              className="font-semibold text-[var(--orange-deep)]"
                            >
                              Télécharger le résultat
                            </a>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {result.vaultDownloadUrl && (
                  <a
                    href={result.vaultDownloadUrl}
                    className="mt-3 inline-block font-semibold text-[var(--orange-deep)]"
                  >
                    Télécharger le vault (à conserver précieusement pour restaurer plus tard)
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
