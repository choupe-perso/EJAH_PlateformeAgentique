import type { Metadata } from "next";
import { SectionHead } from "@/components/SectionHead";
import { ActionButton } from "@/components/ActionButton";
import { KpiTile } from "@/components/KpiTile";
import { MiniTrendChart } from "@/components/MiniTrendChart";

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
        <SectionHead
          eyebrow="Vue d'ensemble"
          title="Cockpit de pilotage"
          action={
            <ActionButton
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width={15}
                  height={15}
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              }
            >
              Lancer un agent
            </ActionButton>
          }
        />

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiTile label="Agents actifs" value="12" trend="+3 aujourd'hui" trendUp />
          <KpiTile label="Tâches en file" value="47" trend="stable" />
          <KpiTile label="Taux de succès" value="94%" trend="+2 pts" trendUp />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MiniTrendChart
            label="Support"
            value={51}
            points={[
              [4, 32],
              [24, 28],
              [44, 34],
              [64, 22],
              [84, 26],
              [104, 14],
              [124, 18],
            ]}
          />
          <MiniTrendChart
            label="Facturation"
            value={34}
            points={[
              [4, 42],
              [24, 40],
              [44, 44],
              [64, 36],
              [84, 38],
              [104, 30],
              [124, 32],
            ]}
          />
          <MiniTrendChart
            label="Import"
            value={19}
            points={[
              [4, 50],
              [24, 48],
              [44, 52],
              [64, 46],
              [84, 47],
              [104, 42],
              [124, 44],
            ]}
          />
        </div>

        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          (a venir : repartition des statuts, liste d&apos;agents)
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
