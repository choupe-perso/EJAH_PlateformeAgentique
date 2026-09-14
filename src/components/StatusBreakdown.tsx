type StatusSegment = { label: string; value: number; color: string };

export function StatusBreakdown({
  title,
  segments,
}: {
  title: string;
  segments: StatusSegment[];
}) {
  return (
    <div className="mb-5 rounded-xl border border-[var(--line)] bg-[var(--card)] px-[15px] py-3.5">
      <div className="mb-[11px] text-xs font-semibold text-[var(--ink-soft)]">
        {title}
      </div>
      <div className="mb-[11px] flex h-[13px] gap-0.5 overflow-hidden rounded-full">
        {segments.map((s) => (
          <span key={s.label} style={{ flex: s.value, background: s.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        {segments.map((s) => (
          <span
            key={s.label}
            className="flex items-center gap-[7px] text-[12.5px] text-[#5C4F49]"
          >
            <span
              className="h-[9px] w-[9px] flex-none rounded-full"
              style={{ background: s.color }}
            />
            {s.label} <b className="ml-0.5 font-bold text-[var(--ink)]">{s.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
