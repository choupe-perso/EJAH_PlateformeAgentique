"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebarCollapsed } from "./Sidebar";

export function SidebarLeaf({
  icon,
  label,
  href,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
}) {
  const collapsed = useSidebarCollapsed();
  const pathname = usePathname();
  if (collapsed) return null;

  const active = href !== undefined && pathname === href;
  const className =
    "flex cursor-pointer items-center gap-[7px] rounded-md py-1.5 pl-6 pr-2 text-xs hover:bg-[var(--canvas)] " +
    (active
      ? "bg-[var(--canvas)] font-semibold text-[var(--ink)]"
      : "text-[#5C4F49]");

  const content = (
    <>
      <span className="flex h-[18px] w-[18px] flex-none items-center justify-center">
        {icon}
      </span>
      {label}
    </>
  );

  if (!href) {
    return <span className={className + " cursor-default opacity-60"}>{content}</span>;
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
