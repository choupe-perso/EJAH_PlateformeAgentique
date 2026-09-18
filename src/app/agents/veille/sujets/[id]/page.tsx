import Link from "next/link";
import { notFound } from "next/navigation";
import { SectionHead } from "@/components/SectionHead";
import { obtenirSujet } from "@/core/veille/sujets";
import { SujetWizard } from "../../_components/SujetWizard";

export default async function SujetDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { cree?: string };
}) {
  const sujet = await obtenirSujet(params.id);
  if (!sujet) notFound();

  return (
    <main className="px-4 py-6 sm:px-7">
      <SectionHead eyebrow="Veille" title={sujet.nom} />
      {searchParams.cree === "1" && (
        <p className="mb-4 rounded-lg border border-[var(--good)] bg-[#EAF7EE] px-3 py-2 text-sm text-[var(--good)]">
          ✓ Sujet créé - ci-dessous le récapitulatif, modifiable à tout moment.
        </p>
      )}
      <p className="mb-4">
        <Link href={`/agents/veille/historique?sujetId=${sujet.id}`} className="text-xs text-[var(--orange-deep)] hover:underline">
          Voir l&apos;historique de ce sujet →
        </Link>
      </p>
      <SujetWizard sujetExistant={sujet} />
    </main>
  );
}
