import { SectionHead } from "@/components/SectionHead";
import { HistoriqueManager } from "../_components/HistoriqueManager";

export default function HistoriquePage({ searchParams }: { searchParams: { sujetId?: string } }) {
  return (
    <main className="px-4 py-6 sm:px-7">
      <SectionHead eyebrow="Veille" title="Historique" />
      <HistoriqueManager sujetIdInitial={searchParams.sujetId} />
    </main>
  );
}
