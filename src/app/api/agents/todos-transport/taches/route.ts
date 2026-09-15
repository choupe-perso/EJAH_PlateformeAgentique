import { NextResponse } from "next/server";
import { creerTache, listerTaches } from "@/core/todosTransport/useCases";
import type { TodoTransportStatut, TodoTransportType } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statutParam = searchParams.get("statut") ?? "active";
  const statut = statutParam === "toutes" ? null : (statutParam as TodoTransportStatut);

  try {
    const taches = await listerTaches({
      statut,
      type: (searchParams.get("type") as TodoTransportType | null) ?? null,
      titreRecherche: searchParams.get("titre"),
    });
    return NextResponse.json({ ok: true, taches });
  } catch {
    return NextResponse.json(
      { ok: false, erreurs: ["Base de donnees injoignable."] },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  const corps = await request.json().catch(() => ({}));
  const type = corps.type;
  const titre = (corps.titre ?? "").trim();

  const resultat = await creerTache(type, titre, corps);
  if (!resultat.ok) {
    return NextResponse.json(resultat);
  }
  return NextResponse.json(resultat);
}
