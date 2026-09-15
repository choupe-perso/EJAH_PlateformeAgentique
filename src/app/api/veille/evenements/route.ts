import { NextResponse } from "next/server";
import { listerEvenements } from "@/core/veille/historique";
import type { PeriodeHistorique } from "@/shared/veille/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const evenements = await listerEvenements({
      sujetId: searchParams.get("sujetId"),
      periode: (searchParams.get("periode") as PeriodeHistorique | null) ?? "tout",
      inclureConnu: searchParams.get("inclureConnu") === "1",
      recherche: searchParams.get("q"),
    });
    return NextResponse.json({ ok: true, evenements });
  } catch {
    return NextResponse.json({ ok: false, erreurs: ["Base de données injoignable."] }, { status: 503 });
  }
}
