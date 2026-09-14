const STAR_PATH =
  "M12 3l2.6 5.8 6.2.6-4.7 4.2 1.4 6.2L12 16.9 6.5 19.8l1.4-6.2L3.2 9.4l6.2-.6L12 3z";

export function StarRating({ value, max }: { value: number; max: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <svg
          key={star}
          viewBox="0 0 24 24"
          width={21}
          height={21}
          fill={star <= value ? "var(--orange)" : "none"}
          stroke={star <= value ? "var(--orange)" : "#F0DCC9"}
          strokeWidth={1.5}
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </div>
  );
}
