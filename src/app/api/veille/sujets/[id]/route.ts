import { NextResponse } from "next/server";
import * as sujetsUseCases from "@/core/veille/sujets";
import { normaliserBrouillon, contratValide } from "@/core/veille/contrat";
import type { ContratChamps, SourceProposee } from "@/shared/veille/types";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const sujet = await sujetsUseCases.obtenirSujet(params.id);
  if (!sujet) return NextResponse.json({ ok: false, erreurs: ["Sujet introuvable."] }, { status: 404 });
  return NextResponse.json({ ok: true, sujet });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const corps = await request.json().catch(() => ({}));

  if (corps.action === "suspendre") {
    await sujetsUseCases.suspendre(params.id);
    return NextResponse.json({ ok: true });
  }
  if (corps.action === "reactiver") {
    await sujetsUseCases.reactiver(params.id);
    return NextResponse.json({ ok: true });
  }

  const brouillon = corps.contrat as Partial<ContratChamps>;
  const sources = (corps.sources as SourceProposee[]) ?? [];
  if (!brouillon?.moteurDialogue || !brouillon?.moteurAnalyse) {
    return NextResponse.json({ ok: false, erreurs: ["Moteurs de dialogue et d'analyse requis."] }, { status: 400 });
  }

  const contrat = normaliserBrouillon(brouillon, brouillon.moteurDialogue, brouillon.moteurAnalyse);
  const erreurs = contratValide(contrat, sources);
  if (erreurs.length > 0) return NextResponse.json({ ok: false, erreurs });

  const sujet = await sujetsUseCases.modifierContrat(params.id, contrat, sources);
  return NextResponse.json({ ok: true, sujet });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const corps = await request.json().catch(() => ({}));
  const resultat = await sujetsUseCases.supprimer(params.id, corps.confirmation === true);
  if (!resultat.ok) return NextResponse.json({ ok: false, erreurs: [resultat.erreur] }, { status: 400 });
  return NextResponse.json({ ok: true });
}
