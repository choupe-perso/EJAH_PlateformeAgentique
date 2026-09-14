import { SectionHead } from "@/components/SectionHead";

export default function CockpitPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-7">
      <SectionHead eyebrow="Vue d'ensemble" title="Cockpit de pilotage" />
      <p className="text-sm text-[var(--ink-soft)]">
        Aucun indicateur pour le moment.
      </p>
    </main>
  );
}
