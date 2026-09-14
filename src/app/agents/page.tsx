import { Sidebar } from "@/components/sidebar/Sidebar";
import { SidebarCategory } from "@/components/sidebar/SidebarCategory";
import { SidebarLeaf } from "@/components/sidebar/SidebarLeaf";
import { SectionHead } from "@/components/SectionHead";

function ToolkitIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={12} height={12}>
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function PersoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="#fff" width={12} height={12}>
      <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" />
    </svg>
  );
}

export default function AgentsPage() {
  return (
    <div className="flex items-start">
      <Sidebar>
        <SidebarCategory label="Toolkit" color="var(--orange)" icon={<ToolkitIcon />}>
          <SidebarLeaf tag="GE" bg="#D8C9BE" fg="#5C4F49" label="Génériques" />
        </SidebarCategory>
        <SidebarCategory label="Perso" color="var(--violet)" icon={<PersoIcon />}>
          <SidebarLeaf tag="VO" bg="#D8C9BE" fg="#5C4F49" label="Voyages" />
          <SidebarLeaf tag="TA" bg="#D8C9BE" fg="#5C4F49" label="Tâches" />
        </SidebarCategory>
      </Sidebar>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7">
        <SectionHead eyebrow="Configuration" title="Mes Agents" />
        <p className="text-sm text-[var(--ink-soft)]">
          Aucun agent pour le moment - selectionnez une categorie dans le
          menu pour commencer.
        </p>
      </main>
    </div>
  );
}
