import { NextResponse } from "next/server";
import { recupererVoyages } from "@/core/voyages/useCases";

export const dynamic = "force-dynamic";

export async function POST() {
  const resultat = await recupererVoyages();
  if (!resultat.ok) {
    return NextResponse.json({ ok: false, erreurs: [resultat.erreur] });
  }
  return NextResponse.json({ ok: true, voyages: resultat.voyages });
}
