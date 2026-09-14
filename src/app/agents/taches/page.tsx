import { SectionHead } from "@/components/SectionHead";
import { TachesManager } from "@/components/todosTransport/TachesManager";

export default function TachesPage() {
  return (
    <main className="px-4 py-6 sm:px-7">
      <SectionHead eyebrow="Perso" title="Tâches" />
      <TachesManager />
    </main>
  );
}
