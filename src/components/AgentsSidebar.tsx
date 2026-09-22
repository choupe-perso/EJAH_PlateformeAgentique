import { Sidebar } from "@/components/sidebar/Sidebar";
import { SidebarCategory } from "@/components/sidebar/SidebarCategory";
import { SidebarLeaf } from "@/components/sidebar/SidebarLeaf";
import {
  GearIcon,
  PersonIcon,
  MaskIcon,
  TrainIcon,
  ChecklistIcon,
} from "@/components/icons";

export function AgentsSidebar() {
  return (
    <Sidebar>
      <SidebarCategory label="Toolkit" color="var(--orange)" icon={<GearIcon size={14} />}>
        <SidebarLeaf
          icon={<MaskIcon size={13} />}
          label="Anonymisation"
          href="/agents/anonymizer"
        />
      </SidebarCategory>
      <SidebarCategory label="Perso" color="var(--violet)" icon={<PersonIcon />}>
        <SidebarLeaf icon={<TrainIcon size={13} />} label="Voyages" href="/agents/voyages" />
        <SidebarLeaf icon={<ChecklistIcon size={13} />} label="Tâches" />
      </SidebarCategory>
    </Sidebar>
  );
}
