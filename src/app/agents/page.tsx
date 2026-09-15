import { SectionHead } from "@/components/SectionHead";

export default function AgentsPage() {
  return (
    <main className="px-4 py-6 sm:px-7">
      <SectionHead eyebrow="Configuration" title="Mes Agents" />
      <p className="text-sm text-[var(--ink-soft)]">
        Aucun agent pour le moment - selectionnez une categorie dans le
        menu pour commencer.
      </p>
    </main>
  );
}
