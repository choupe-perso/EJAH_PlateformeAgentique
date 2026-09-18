import { SectionHead } from "@/components/SectionHead";
import { AnonymisationManager } from "@/components/anonymisation/AnonymisationManager";

export default function AnonymisationPage() {
  return (
    <main className="px-4 py-6 sm:px-7">
      <SectionHead eyebrow="Toolkit" title="Anonymisation" />
      <AnonymisationManager />
    </main>
  );
}
