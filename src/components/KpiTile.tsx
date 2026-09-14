export function KpiTile({
  label,
  value,
  trend,
  trendUp,
}: {
  label: string;
  value: string;
  trend: string;
  trendUp?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-[15px] py-[13px]">
      <span className="mb-[7px] block text-[11.5px] text-[var(--ink-soft)]">
        {label}
      </span>
      <span className="block font-[var(--font-sora)] text-2xl font-bold">
        {value}
      </span>
      <span
        className={
          "mt-[5px] block text-[11px] " +
          (trendUp ? "text-[var(--good)]" : "text-[var(--ink-soft)]")
        }
      >
        {trend}
      </span>
    </div>
  );
}
