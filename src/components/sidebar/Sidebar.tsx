"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const CollapsedContext = createContext(false);

export function useSidebarCollapsed() {
  return useContext(CollapsedContext);
}

export function Sidebar({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <CollapsedContext.Provider value={collapsed}>
      <aside
        className={
          "flex-none overflow-hidden border-r border-[var(--line)] bg-[var(--card)] py-3.5 text-[13px] transition-[width,padding] duration-200 " +
          (collapsed ? "w-[60px] px-2" : "w-[236px] px-2.5")
        }
      >
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          {!collapsed && (
            <span className="font-[var(--font-ibm-plex-mono)] text-[9.5px] uppercase tracking-[0.08em] text-[var(--ink-soft2)]">
              Navigation
            </span>
          )}
          <button
            type="button"
            title="Réduire/agrandir le menu"
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md bg-[var(--canvas)] text-[var(--ink-soft)]"
          >
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              style={{ transform: collapsed ? "rotate(180deg)" : undefined }}
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        </div>
        {children}
      </aside>
    </CollapsedContext.Provider>
  );
}
