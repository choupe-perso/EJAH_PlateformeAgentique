import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gabarit — reference UI (EJAH)",
  robots: { index: false, follow: false },
};

export default function GabaritPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-7">
      <p className="mb-8 rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--ink-soft)]">
        Page de reference interne, non reliee a la navigation. Chaque
        morceau de la maquette <code>UIDesigner/ejah-template-*.html</code>{" "}
        est porte ici, valide, puis reutilise dans les vraies pages
        (<code>/cockpit</code>, <code>/agents</code>).
      </p>

      <section>
        <h1 className="font-[var(--font-sora)] text-xl font-bold">
          Cockpit
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          (a venir : tuiles KPI, mini-graphiques par agent, repartition des
          statuts, liste d&apos;agents)
        </p>
      </section>

      <section className="mt-12">
        <h1 className="font-[var(--font-sora)] text-xl font-bold">
          Mes Agents
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          (a venir : formulaire de creation d&apos;agent, galerie complete
          des types de champs)
        </p>
      </section>
    </main>
  );
}
