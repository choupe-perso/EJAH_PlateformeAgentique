import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { SidebarCategory } from "@/components/sidebar/SidebarCategory";
import { SidebarLeaf } from "@/components/sidebar/SidebarLeaf";
import {
  GearIcon,
  PersonIcon,
  TrainIcon,
  ChecklistIcon,
  MaskIcon,
  RadarIcon,
} from "@/components/icons";

export default function AgentsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start">
      <Sidebar>
        <SidebarCategory label="Toolkit" color="var(--orange)" icon={<GearIcon size={14} />}>
          <SidebarLeaf icon={<MaskIcon size={13} />} label="Anonymisation" href="/agents/anonymisation" />
          <SidebarLeaf icon={<RadarIcon size={13} />} label="Veille" href="/agents/veille" />
        </SidebarCategory>
        <SidebarCategory label="Perso" color="var(--violet)" icon={<PersonIcon />}>
          <SidebarLeaf icon={<TrainIcon size={13} />} label="Trajets SNCF" href="/agents/voyages" />
          <SidebarLeaf icon={<ChecklistIcon size={13} />} label="TODO Offline" href="/agents/taches" />
        </SidebarCategory>
      </Sidebar>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
