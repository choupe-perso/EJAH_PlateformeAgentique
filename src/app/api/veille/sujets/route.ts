import { NextResponse } from "next/server";
import * as sujetsUseCases from "@/core/veille/sujets";
import { normaliserBrouillon, contratValide } from "@/core/veille/contrat";
import type { ContratChamps, SourceProposee } from "@/shared/veille/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sujets = await sujetsUseCases.listerSujetsResume();
    return NextResponse.json({ ok: true, sujets });
  } catch {
    return NextResponse.json({ ok: false, erreurs: ["Base de données injoignable."] }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const corps = await request.json().catch(() => ({}));
  const brouillon = corps.contrat as Partial<ContratChamps>;
  const sources = (corps.sources as SourceProposee[]) ?? [];
  const creePar = (corps.creePar as string | undefined) ?? null;

  if (!brouillon?.moteurDialogue || !brouillon?.moteurAnalyse) {
    return NextResponse.json({ ok: false, erreurs: ["Moteurs de dialogue et d'analyse requis."] }, { status: 400 });
  }

  const contrat = normaliserBrouillon(brouillon, brouillon.moteurDialogue, brouillon.moteurAnalyse);
  const erreurs = contratValide(contrat, sources);
  if (erreurs.length > 0) {
    return NextResponse.json({ ok: false, erreurs });
  }

  const sujet = await sujetsUseCases.creerDepuisContrat(contrat, sources, creePar);
  return NextResponse.json({ ok: true, sujet });
}
