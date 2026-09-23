"use client";

import { useEffect, useState } from "react";
import { AgentsSidebar } from "@/components/AgentsSidebar";
import { SectionHead } from "@/components/SectionHead";
import { TachesManager } from "@/components/todosTransport/TachesManager";

interface AgentSummary {
  id: string;
  name: string;
  description: string;
}

export default function TachesPage() {
  const [agent, setAgent] = useState<AgentSummary | null>(null);
  const [agentError, setAgentError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents/taches")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Gateway indisponible.");
        setAgent(body);
      })
      .catch((e) => setAgentError(e instanceof Error ? e.message : "Erreur inconnue"));
  }, []);

  return (
    <div className="flex items-start">
      <AgentsSidebar />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7">
        <SectionHead eyebrow="Perso · Tâches" title="RDV, emails, prompts" />

        {agentError && (
          <p className="mb-4 max-w-2xl rounded-xl border-[1.5px] border-[var(--critical)] bg-white px-4 py-3 text-sm text-[var(--critical)]">
            {agentError} — la gateway Python est-elle démarrée (port 9010) ?
          </p>
        )}

        {agent && (
          <>
            <p className="mb-5 max-w-2xl text-sm text-[var(--ink-soft)]">{agent.description}</p>
            <TachesManager />
          </>
        )}
      </main>
    </div>
  );
}
