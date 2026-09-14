"use client";

import type { ReactNode } from "react";
import { useSidebarCollapsed } from "./Sidebar";

export function SidebarLeaf({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  const collapsed = useSidebarCollapsed();
  if (collapsed) return null;

  return (
    <a className="flex cursor-pointer items-center gap-[7px] rounded-md py-1.5 pl-6 pr-2 text-xs text-[#5C4F49] hover:bg-[var(--canvas)]">
      <span className="flex h-[18px] w-[18px] flex-none items-center justify-center">
        {icon}
      </span>
      {label}
    </a>
  );
}
