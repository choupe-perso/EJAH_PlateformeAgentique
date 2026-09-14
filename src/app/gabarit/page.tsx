import type { Metadata } from "next";
import { SectionHead } from "@/components/SectionHead";
import { ActionButton } from "@/components/ActionButton";
import { KpiTile } from "@/components/KpiTile";
import { MiniTrendChart } from "@/components/MiniTrendChart";
import { StatusBreakdown } from "@/components/StatusBreakdown";
import { AgentList, AgentRow } from "@/components/AgentList";
import { UtilityIconButton } from "@/components/UtilityIconButton";
import {
  ArrowRightIcon,
  SpinnerIcon,
  CheckIcon,
  ErrorIcon,
  CopyIcon,
  DownloadIcon,
} from "@/components/icons";

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
            <ActionButton icon={<ArrowRightIcon />}>Lancer un agent</ActionButton>
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

        <StatusBreakdown
          title="Statuts d'exécution (7 jours)"
          segments={[
            { label: "Succès", value: 402, color: "var(--good)" },
            { label: "En cours", value: 62, color: "var(--warn)" },
            { label: "Erreur", value: 51, color: "var(--critical)" },
          ]}
        />

        <div className="mb-2.5 text-xs font-semibold text-[var(--ink-soft)]">
          Agents
        </div>
        <AgentList>
          <AgentRow name="Agent Facturation" dotColor="#8A7A72" meta="prêt">
            <ActionButton icon={<ArrowRightIcon />}>Lancer l&apos;agent</ActionButton>
            <UtilityIconButton title="Copier" icon={<CopyIcon />} />
          </AgentRow>
          <AgentRow name="Agent Support" dotColor="var(--warn)" meta="en cours">
            <ActionButton variant="loading" icon={<SpinnerIcon />}>
              Traitement…
            </ActionButton>
            <UtilityIconButton title="Copier" icon={<CopyIcon />} />
          </AgentRow>
          <AgentRow
            name="Agent Import"
            dotColor="var(--good)"
            meta="terminé il y a 2 min"
          >
            <ActionButton variant="success" icon={<CheckIcon />}>
              Terminé
            </ActionButton>
            <UtilityIconButton
              title="Télécharger le résultat"
              icon={<DownloadIcon />}
            />
          </AgentRow>
          <AgentRow
            name="Agent Onboarding"
            dotColor="var(--critical)"
            meta="échec il y a 12 min"
          >
            <ActionButton variant="error" icon={<ErrorIcon />}>
              Échec
            </ActionButton>
            <UtilityIconButton title="Copier le journal d'erreur" icon={<CopyIcon />} />
            <UtilityIconButton title="Télécharger le journal" icon={<DownloadIcon />} />
          </AgentRow>
        </AgentList>
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
