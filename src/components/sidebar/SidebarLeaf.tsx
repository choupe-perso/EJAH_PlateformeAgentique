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

  const actif = href ? pathname?.startsWith(href) : false;
  const classe =
    "flex cursor-pointer items-center gap-[7px] rounded-md py-1.5 pl-6 pr-2 text-xs hover:bg-[var(--canvas)] " +
    (actif ? "bg-[var(--tint-active-bg)] font-semibold text-[var(--orange-deep)]" : "text-[#5C4F49]");

  const contenu = (
    <>
      <span className="flex h-[18px] w-[18px] flex-none items-center justify-center">{icon}</span>
      {label}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classe}>
        {contenu}
      </Link>
    );
  }
  return <a className={classe}>{contenu}</a>;
}
