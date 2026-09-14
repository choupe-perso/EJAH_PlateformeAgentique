export function SelectChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={
            "rounded-full border-[1.5px] px-[15px] py-[6.5px] text-[12.5px] font-semibold " +
            (value === opt.value
              ? "border-[var(--orange)] bg-[var(--orange)] text-white"
              : "border-[var(--line)] bg-white text-[#5C4F49]")
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
