import type { ReactNode } from "react";

export function Timeline({ children }: { children: ReactNode }) {
  return (
    <div className="relative pl-[18px] before:absolute before:bottom-[5px] before:left-[3px] before:top-[5px] before:w-[1.5px] before:bg-[var(--line)] before:content-['']">
      {children}
    </div>
  );
}

export function TimelineItem({
  dotColor,
  children,
}: {
  dotColor: string;
  children: ReactNode;
}) {
  return (
    <div className="relative pb-[15px] text-[13px] last:pb-0">
      <span
        className="absolute -left-[18px] top-1 h-2 w-2 rounded-full"
        style={{ background: dotColor }}
      />
      {children}
    </div>
  );
}

const ENV_BADGE_CLASSES: Record<"dev" | "test" | "prod", string> = {
  dev: "bg-[#D8F0F7] text-[#0086A3]",
  test: "bg-[#DCF3EA] text-[#0D7A52]",
  prod: "bg-[#FFE4CF] text-[var(--orange-deep)]",
};

export function DeploymentTimelineItem({
  dotColor,
  env,
  version,
  date,
}: {
  dotColor: string;
  env: "dev" | "test" | "prod";
  version: string;
  date: string;
}) {
  return (
    <TimelineItem dotColor={dotColor}>
      <span
        className={
          "rounded-full px-2 py-0.5 font-[var(--font-ibm-plex-mono)] text-[10px] font-semibold tracking-wide " +
          ENV_BADGE_CLASSES[env]
        }
      >
        {env.toUpperCase()}
      </span>
      <span className="ml-1.5 font-[var(--font-ibm-plex-mono)] font-semibold text-[var(--ink)]">
        {version}
      </span>
      <span className="mt-[3px] block font-[var(--font-ibm-plex-mono)] text-[11px] text-[var(--ink-soft2)]">
        {date}
      </span>
    </TimelineItem>
  );
}

export function ActionTimelineItem({
  dotColor,
  text,
  meta,
}: {
  dotColor: string;
  text: string;
  meta: string;
}) {
  return (
    <TimelineItem dotColor={dotColor}>
      <span className="text-[var(--ink)]">{text}</span>
      <span className="mt-[3px] block font-[var(--font-ibm-plex-mono)] text-[11px] text-[var(--ink-soft2)]">
        {meta}
      </span>
    </TimelineItem>
  );
}
