type Mood = {
  key: string;
  bg: string;
  color: string;
  eyebrows?: string;
  eyeCy: number;
  mouth: string;
  caption: string;
  defaultChecked?: boolean;
};

const MOODS: Mood[] = [
  {
    key: "angry",
    bg: "#EFE9E6",
    color: "#2B2320",
    eyebrows: "M6.5 9.3l3-1.1M17.5 9.3l-3-1.1",
    eyeCy: 11.2,
    mouth: "M7.5 17 Q12 12.5 16.5 17",
    caption: "En colère",
  },
  {
    key: "very-unhappy",
    bg: "#FCE5E2",
    color: "#C22A21",
    eyebrows: "M7 9.6l2.6-1M17 9.6l-2.6-1",
    eyeCy: 11.2,
    mouth: "M8 16.5 Q12 13 16 16.5",
    caption: "Pas content du tout",
  },
  {
    key: "unhappy",
    bg: "#FDECDA",
    color: "#D9720A",
    eyeCy: 10.8,
    mouth: "M8.5 16 Q12 14 15.5 16",
    caption: "Mécontent",
  },
  {
    key: "neutral",
    bg: "#FDE3EE",
    color: "#D42875",
    eyeCy: 10.8,
    mouth: "M8.5 15.2 L15.5 15.2",
    caption: "Neutre",
  },
  {
    key: "happy",
    bg: "#E1F4E9",
    color: "#2E8C56",
    eyeCy: 10.8,
    mouth: "M8 14 Q12 16.8 16 14",
    caption: "Content",
    defaultChecked: true,
  },
  {
    key: "very-happy",
    bg: "#DEF5F8",
    color: "#1AA5B5",
    eyeCy: 10.5,
    mouth: "M7.3 13.5 Q12 18.2 16.7 13.5",
    caption: "Très content",
  },
];

export function MoodRating({ name }: { name: string }) {
  return (
    <div className="flex flex-wrap gap-[9px]">
      {MOODS.map((mood) => (
        <span
          key={mood.key}
          className="relative inline-flex flex-col items-center gap-1.5"
        >
          <input
            type="radio"
            name={name}
            defaultChecked={mood.defaultChecked}
            className="peer absolute inset-x-0 top-0 z-10 m-0 h-11 cursor-pointer opacity-0"
          />
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full peer-checked:shadow-[0_0_0_2px_#fff,0_0_0_4px_var(--mood-color)]"
            style={
              {
                background: mood.bg,
                color: mood.color,
                "--mood-color": mood.color,
              } as React.CSSProperties
            }
          >
            <svg
              width={26}
              height={26}
              viewBox="0 0 24 24"
              fill="none"
              stroke={mood.color}
              strokeWidth={1.4}
              strokeLinecap="round"
            >
              <circle cx={12} cy={12} r={9.3} />
              {mood.eyebrows && <path d={mood.eyebrows} />}
              <circle cx={9} cy={mood.eyeCy} r={0.9} fill={mood.color} stroke="none" />
              <circle cx={15} cy={mood.eyeCy} r={0.9} fill={mood.color} stroke="none" />
              <path d={mood.mouth} />
            </svg>
          </span>
          <span className="max-w-16 text-center text-[9.5px] text-[var(--ink-soft2)]">
            {mood.caption}
          </span>
        </span>
      ))}
    </div>
  );
}
