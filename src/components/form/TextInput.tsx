import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const inputClass =
  "w-full rounded-xl border-[1.5px] border-[var(--line)] bg-white px-[13px] py-[9.5px] text-[13.5px] text-[var(--ink)] focus:border-[var(--orange)] focus:outline-none focus:ring-[3px] focus:ring-[rgba(255,106,0,0.15)] read-only:cursor-not-allowed read-only:bg-[var(--canvas)] read-only:text-[var(--ink-soft)]";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={inputClass + " min-h-[60px] resize-y"} />;
}
