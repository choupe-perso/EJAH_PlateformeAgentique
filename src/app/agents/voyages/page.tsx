import { SectionHead } from "@/components/SectionHead";
import { VoyagesManager } from "@/components/voyages/VoyagesManager";
import { racineProjet } from "@/shared/env";

export default function VoyagesPage() {
  return (
    <main className="px-4 py-6 sm:px-7">
      <SectionHead eyebrow="Perso" title="Voyages" />
      <VoyagesManager racineProjet={racineProjet()} />
    </main>
  );
}
