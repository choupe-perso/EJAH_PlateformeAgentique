import { SectionHead } from "@/components/SectionHead";
import { CentreVeilleManager } from "./_components/CentreVeilleManager";

export default function VeillePage() {
  return (
    <main className="px-4 py-6 sm:px-7">
      <SectionHead eyebrow="Toolkit" title="Centre de veille" />
      <CentreVeilleManager />
    </main>
  );
}
