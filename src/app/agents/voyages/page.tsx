import { SectionHead } from "@/components/SectionHead";
import { VoyagesManager } from "@/components/voyages/VoyagesManager";

export default function VoyagesPage() {
  return (
    <main className="px-4 py-6 sm:px-7">
      <SectionHead eyebrow="Perso" title="Voyages" />
      <VoyagesManager />
    </main>
  );
}
