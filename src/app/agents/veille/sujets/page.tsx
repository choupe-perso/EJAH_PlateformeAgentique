import { SectionHead } from "@/components/SectionHead";
import { SujetsManager } from "../_components/SujetsManager";

export default function SujetsPage() {
  return (
    <main className="px-4 py-6 sm:px-7">
      <SectionHead eyebrow="Veille" title="Sujets" />
      <SujetsManager />
    </main>
  );
}
