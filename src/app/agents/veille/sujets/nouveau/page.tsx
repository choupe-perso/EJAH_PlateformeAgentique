import { SectionHead } from "@/components/SectionHead";
import { SujetWizard } from "../../_components/SujetWizard";

export default function NouveauSujetPage() {
  return (
    <main className="px-4 py-6 sm:px-7">
      <SectionHead eyebrow="Veille" title="Nouveau sujet" />
      <SujetWizard />
    </main>
  );
}
