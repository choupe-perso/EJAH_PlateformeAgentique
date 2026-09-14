export function MiniTrendChart({
  label,
  value,
  points,
}: {
  label: string;
  value: number;
  points: [number, number][];
}) {
  const pointsAttr = points.map(([x, y]) => `${x},${y}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--card)] px-3.5 pb-[11px] pt-[13px]">
      <div className="mb-[9px] flex items-baseline justify-between text-xs font-semibold text-[var(--ink-soft)]">
        <span>{label}</span>
        <b className="font-[var(--font-sora)] text-[15px] font-bold text-[var(--ink)]">
          {value}
        </b>
      </div>
      <svg viewBox="0 0 140 76" className="block h-auto w-full">
        <line x1={4} y1={62} x2={136} y2={62} stroke="var(--line)" strokeWidth={1} />
        <polyline
          points={pointsAttr}
          fill="none"
          stroke="var(--orange)"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={lastX}
          cy={lastY}
          r={3}
          fill="var(--orange)"
          stroke="#fff"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
