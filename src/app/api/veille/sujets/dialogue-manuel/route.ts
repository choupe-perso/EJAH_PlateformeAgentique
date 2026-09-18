import { NextResponse } from "next/server";
import { tourQualificationManuel } from "@/core/veille/qualification";
import type { TourDialogue } from "@/shared/veille/moteur";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const corps = await request.json().catch(() => ({}));
  const historique = (corps.historique as TourDialogue[]) ?? [];
  const reponseBrute = (corps.reponseBrute ?? "").trim();

  if (!reponseBrute) {
    return NextResponse.json({ ok: false, erreurs: ["Reponse collee requise."] }, { status: 400 });
  }

  const resultat = await tourQualificationManuel({ historique, reponseBrute });

  if (resultat.status === "indisponible") {
    return NextResponse.json({ ok: false, indisponible: true, raison: resultat.raison });
  }

  return NextResponse.json({ ok: true, ...resultat.valeur });
}
