import Link from "next/link";

const universes = [
  {
    href: "/cockpit",
    title: "Cockpit",
    description: "Indicateurs de pilotage",
  },
  {
    href: "/agents",
    title: "Agents",
    description: "Outils et agents specialises",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          EJAH
        </h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          Ecosysteme de Jonction et d&apos;Assistance Humaine
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        {universes.map((universe) => (
          <Link
            key={universe.href}
            href={universe.href}
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md"
          >
            <h2 className="text-lg font-medium">{universe.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {universe.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
