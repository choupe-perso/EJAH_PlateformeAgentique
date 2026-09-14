export function Chip({
  type,
  name,
  label,
  defaultChecked,
}: {
  type: "radio" | "checkbox";
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <span className="relative inline-flex">
      <input
        type={type}
        name={name}
        defaultChecked={defaultChecked}
        className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
      />
      <span className="rounded-full border-[1.5px] border-[var(--line)] bg-white px-[15px] py-[6.5px] text-[12.5px] font-semibold text-[#5C4F49] peer-checked:border-[var(--orange)] peer-checked:bg-[var(--orange)] peer-checked:text-white">
        {label}
      </span>
    </span>
  );
}
