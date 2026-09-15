import { NextResponse } from "next/server";
import { proposerSources } from "@/core/veille/qualification";
import type { MoteurId } from "@/shared/veille/moteur";
import type { ContratChamps } from "@/shared/veille/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const corps = await request.json().catch(() => ({}));
  const moteurId = corps.moteurId as MoteurId;
  const contrat = corps.contrat as ContratChamps;

  if (!moteurId || !contrat) {
    return NextResponse.json({ ok: false, erreurs: ["Moteur et contrat requis."] }, { status: 400 });
  }

  const resultat = await proposerSources(moteurId, contrat);
  if (resultat.status === "indisponible") {
    return NextResponse.json({ ok: false, indisponible: true, raison: resultat.raison });
  }
  return NextResponse.json({ ok: true, sources: resultat.valeur.sources });
}
