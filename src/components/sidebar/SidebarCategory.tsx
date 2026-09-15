"use client";

import type { ReactNode } from "react";
import { useSidebarCollapsed } from "./Sidebar";

export function SidebarCategory({
  label,
  color,
  icon,
  defaultOpen = true,
  children,
}: {
  label: string;
  color: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children?: ReactNode;
}) {
  const collapsed = useSidebarCollapsed();

  return (
    <details
      open={defaultOpen}
      className="mb-1 rounded-r-lg border-l-[3px]"
      style={{ borderColor: color }}
    >
      <summary
        className={
          "flex cursor-pointer list-none items-center gap-2 rounded-r-lg py-[7px] text-[12.5px] font-bold [&::-webkit-details-marker]:hidden " +
          (collapsed ? "justify-center px-0" : "px-2")
        }
      >
        <span
          className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md text-white"
          style={{ background: color }}
        >
          {icon}
        </span>
        {!collapsed && (
          <>
            <span>{label}</span>
            <svg
              className="ml-auto"
              width={11}
              height={11}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8A7A72"
              strokeWidth={2}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </>
        )}
      </summary>
      {!collapsed && children}
    </details>
  );
}
