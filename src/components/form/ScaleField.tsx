export function ScaleField({
  name,
  steps,
  defaultValue,
  lowLabel,
  highLabel,
}: {
  name: string;
  steps: number;
  defaultValue: number;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: steps }, (_, i) => i + 1).map((step) => (
          <span key={step} className="relative inline-flex">
            <input
              type="radio"
              name={name}
              defaultChecked={step === defaultValue}
              className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
            />
            <label className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-[var(--line)] bg-white font-[var(--font-ibm-plex-mono)] text-[12.5px] font-bold text-[#5C4F49] peer-checked:border-[var(--orange)] peer-checked:bg-[var(--orange)] peer-checked:text-white">
              {step}
            </label>
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10.5px] text-[var(--ink-soft2)]">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
