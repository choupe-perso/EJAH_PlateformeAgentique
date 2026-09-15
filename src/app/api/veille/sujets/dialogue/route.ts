import { NextResponse } from "next/server";
import { tourQualification } from "@/core/veille/qualification";
import type { MoteurId, TourDialogue } from "@/shared/veille/moteur";
import type { ContratChamps } from "@/shared/veille/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const corps = await request.json().catch(() => ({}));
  const moteurId = corps.moteurId as MoteurId;
  const historique = (corps.historique as TourDialogue[]) ?? [];
  const messageUtilisateur = (corps.messageUtilisateur ?? "").trim();
  const contratActuel = (corps.contratActuel as ContratChamps | undefined) ?? undefined;

  if (!moteurId || !messageUtilisateur) {
    return NextResponse.json({ ok: false, erreurs: ["Moteur et message requis."] }, { status: 400 });
  }

  const resultat = await tourQualification({ moteurId, historique, messageUtilisateur, contratActuel });

  if (resultat.status === "indisponible") {
    return NextResponse.json({ ok: false, indisponible: true, raison: resultat.raison });
  }

  return NextResponse.json({ ok: true, ...resultat.valeur });
}
