import type { ReactNode } from "react";

export function CardOption({
  name,
  label,
  icon,
  defaultChecked,
}: {
  name: string;
  label: string;
  icon: ReactNode;
  defaultChecked?: boolean;
}) {
  return (
    <span className="relative min-w-[100px] flex-1">
      <input
        type="radio"
        name={name}
        defaultChecked={defaultChecked}
        className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0"
      />
      <label className="flex flex-col items-center gap-[7px] rounded-[14px] border-[1.5px] border-[var(--line)] bg-white px-2 py-[13.5px] text-center text-xs font-semibold text-[#5C4F49] peer-checked:border-[var(--orange)] peer-checked:bg-[var(--orange)] peer-checked:text-white">
        {icon}
        {label}
      </label>
    </span>
  );
}
