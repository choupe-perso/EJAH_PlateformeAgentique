export function Dropzone({ fileName }: { fileName?: string }) {
  return (
    <div className="flex flex-col items-center gap-[7px] rounded-[14px] border-[1.5px] border-dashed border-[#D8C9BE] bg-white px-4 py-[19px] text-center text-[var(--ink-soft)]">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        width={21}
        height={21}
      >
        <path d="M12 16V4" />
        <path d="M7 9l5-5 5 5" />
        <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
      </svg>
      <span className="text-[13px] font-semibold text-[var(--ink)]">
        Glissez un fichier ici
      </span>
      <span className="text-[11.5px] text-[var(--ink-soft2)]">
        ou cliquez pour parcourir · CSV, XLSX
      </span>
      {fileName && (
        <span className="mt-[9px] inline-flex items-center gap-1.5 rounded-full bg-[var(--tint-active-bg)] px-2.5 py-1 font-[var(--font-ibm-plex-mono)] text-[10.5px] text-[var(--orange-deep)]">
          {fileName}
        </span>
      )}
    </div>
  );
}
