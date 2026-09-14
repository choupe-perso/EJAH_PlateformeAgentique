import { Sidebar } from "@/components/sidebar/Sidebar";
import { SidebarCategory } from "@/components/sidebar/SidebarCategory";
import { SidebarLeaf } from "@/components/sidebar/SidebarLeaf";
import { SectionHead } from "@/components/SectionHead";
import {
  GearIcon,
  PersonIcon,
  PuzzleIcon,
  TrainIcon,
  ChecklistIcon,
} from "@/components/icons";

export default function AgentsPage() {
  return (
    <div className="flex items-start">
      <Sidebar>
        <SidebarCategory label="Toolkit" color="var(--orange)" icon={<GearIcon size={14} />}>
          <SidebarLeaf
            icon={<PuzzleIcon size={13} />}
            bg="#D8C9BE"
            fg="#5C4F49"
            label="Génériques"
          />
        </SidebarCategory>
        <SidebarCategory label="Perso" color="var(--violet)" icon={<PersonIcon />}>
          <SidebarLeaf
            icon={<TrainIcon size={13} />}
            bg="#D8C9BE"
            fg="#5C4F49"
            label="Voyages"
          />
          <SidebarLeaf
            icon={<ChecklistIcon size={13} />}
            bg="#D8C9BE"
            fg="#5C4F49"
            label="Tâches"
          />
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
