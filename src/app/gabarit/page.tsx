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
import { Field } from "@/components/form/Field";
import { FieldLegend } from "@/components/form/FieldLegend";
import { TextInput, TextArea } from "@/components/form/TextInput";
import { Chip } from "@/components/form/Chip";
import { ScaleField } from "@/components/form/ScaleField";
import { CardOption } from "@/components/form/CardSelectField";
import { Dropzone } from "@/components/form/Dropzone";
import { StarRating } from "@/components/form/StarRating";
import { MoodRating } from "@/components/form/MoodRating";
import { DateChip } from "@/components/footer/DateChip";
import {
  Timeline,
  DeploymentTimelineItem,
  ActionTimelineItem,
} from "@/components/footer/Timeline";
import { HistPanel } from "@/components/footer/HistPanel";
import {
  Footer,
  FooterDates,
  FooterHistCols,
  FooterSignature,
} from "@/components/footer/Footer";

export const metadata: Metadata = {
  title: "Gabarit — reference UI (EJAH)",
  robots: { index: false, follow: false },
};

export default function GabaritPage() {
  return (
    <>
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
        <SectionHead eyebrow="Configuration" title="Nouvel agent" />

        <FieldLegend>
          <Field label="Nom de l'agent" family="user">
            <TextInput type="text" placeholder="Ex : Agent Facturation" />
          </Field>
          <Field label="Instructions pour l'agent" family="user">
            <TextArea rows={2} placeholder="Décrivez le rôle de l'agent…" />
          </Field>
          <Field label="Identifiant technique" family="platform">
            <TextInput type="text" defaultValue="agt_8f21c4e0" readOnly />
          </Field>
          <Field label="Date de création" family="platform">
            <TextInput type="text" defaultValue="12/09/2026 09:14" readOnly />
          </Field>
        </FieldLegend>

        <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
          <Field label="Nom de l'agent" family="user">
            <TextInput type="text" placeholder="Ex : Agent Facturation" />
          </Field>

          <Field label="Instructions pour l'agent" family="user">
            <TextArea rows={2} placeholder="Décrivez le rôle de l'agent…" />
          </Field>

          <Field label="Modèle IA" family="user">
            <div className="flex flex-wrap gap-[9px]">
              <Chip type="radio" name="model" label="Sonnet 5" defaultChecked />
              <Chip type="radio" name="model" label="Opus 5" />
              <Chip type="radio" name="model" label="Haiku 4.5" />
            </div>
          </Field>

          <Field label="Sources de données" family="user">
            <div className="flex flex-wrap gap-[9px]">
              <Chip type="checkbox" name="src" label="CRM" defaultChecked />
              <Chip type="checkbox" name="src" label="Emails" defaultChecked />
              <Chip type="checkbox" name="src" label="ERP" />
              <Chip type="checkbox" name="src" label="Documents" />
            </div>
          </Field>

          <Field label="Date de mise en production" family="user">
            <TextInput type="date" defaultValue="2026-10-01" />
          </Field>

          <Field label="Niveau de confiance requis" family="user">
            <ScaleField
              name="scale"
              steps={5}
              defaultValue={3}
              lowLabel="Faible"
              highLabel="Élevé"
            />
          </Field>

          <Field label="Type d'agent" family="user" span2>
            <div className="flex flex-wrap gap-[9px]">
              <CardOption
                name="type"
                label="Support"
                defaultChecked
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={21} height={21}>
                    <path d="M4 13v-1a8 8 0 0116 0v1" />
                    <rect x={2} y={13} width={4} height={6} rx={1.5} />
                    <rect x={18} y={13} width={4} height={6} rx={1.5} />
                  </svg>
                }
              />
              <CardOption
                name="type"
                label="Facturation"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={21} height={21}>
                    <rect x={5} y={3} width={14} height={18} rx={2} />
                    <path d="M9 8h6M9 12h6M9 16h4" />
                  </svg>
                }
              />
              <CardOption
                name="type"
                label="Import"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={21} height={21}>
                    <ellipse cx={12} cy={6} rx={7} ry={3} />
                    <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
                    <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
                  </svg>
                }
              />
            </div>
          </Field>

          <Field label="Importer un jeu de données" family="user">
            <Dropzone fileName="clients_q3.csv" />
          </Field>

          <Field label="Identifiant technique" family="platform">
            <TextInput type="text" defaultValue="agt_8f21c4e0" readOnly />
          </Field>

          <Field label="Date de création" family="platform">
            <TextInput type="text" defaultValue="12/09/2026 09:14" readOnly />
          </Field>

          <Field label="Évaluez cette réponse" family="user">
            <StarRating value={4} max={5} />
          </Field>

          <Field
            label="Comment vous sentez-vous suite à cette interaction ?"
            family="user"
            span2
          >
            <MoodRating name="mood" />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <ActionButton>Créer l&apos;agent</ActionButton>
          <UtilityIconButton
            title="Importer un modèle"
            label="Importer un modèle"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={15} height={15}>
                <path d="M12 16V4" />
                <path d="M7 9l5-5 5 5" />
                <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
              </svg>
            }
          />
        </div>
      </section>
    </main>

      <Footer>
        <FooterDates>
          <DateChip
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x={3} y={5} width={18} height={16} rx={2} />
                <path d="M16 3v4M8 3v4M3 10h18" />
              </svg>
            }
          >
            Site mis à jour le <b className="text-[var(--ink)]">12/09/2026</b>
          </DateChip>
          <DateChip
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 12a9 9 0 11-3-6.7" />
                <path d="M21 3v6h-6" />
              </svg>
            }
          >
            Données rechargées <b className="text-[var(--ink)]">il y a 4 min</b>
          </DateChip>
        </FooterDates>

        <FooterHistCols>
          <HistPanel title="Historique des mises à jour">
            <Timeline>
              <DeploymentTimelineItem dotColor="#FF6A00" env="prod" version="v2.4.1" date="12/09/2026" />
              <DeploymentTimelineItem dotColor="#16A672" env="test" version="v2.4.0" date="08/09/2026" />
              <DeploymentTimelineItem dotColor="var(--orange)" env="dev" version="v2.4.0-rc1" date="05/09/2026" />
              <DeploymentTimelineItem dotColor="#FF6A00" env="prod" version="v2.3.0" date="29/08/2026" />
            </Timeline>
          </HistPanel>
          <HistPanel title="Historique des actions">
            <Timeline>
              <ActionTimelineItem
                dotColor="var(--orange)"
                text="Lancement de l'agent Facturation"
                meta="Vous · 13/09 09:14"
              />
              <ActionTimelineItem
                dotColor="var(--orange)"
                text="Import de clients_q3.csv"
                meta="Vous · 12/09 16:42"
              />
              <ActionTimelineItem
                dotColor="var(--orange)"
                text="Modification du modèle (Agent Support)"
                meta="Vous · 12/09 11:05"
              />
              <ActionTimelineItem
                dotColor="var(--orange)"
                text="Export du rapport mensuel"
                meta="Vous · 11/09 17:20"
              />
            </Timeline>
          </HistPanel>
        </FooterHistCols>

        <FooterSignature environment="DEV" />
      </Footer>
    </>
  );
}
