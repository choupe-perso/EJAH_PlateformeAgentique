import { AgentsSidebar } from "@/components/AgentsSidebar";
import { SectionHead } from "@/components/SectionHead";

export default function AgentsPage() {
  return (
    <div className="flex items-start">
      <AgentsSidebar />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7">
        <SectionHead eyebrow="Configuration" title="Mes Agents" />
        <p className="text-sm text-[var(--ink-soft)]">
          Aucun agent pour le moment - selectionnez une categorie dans le
          menu pour commencer.
        </p>
      </main>
    </div>
  );
}
