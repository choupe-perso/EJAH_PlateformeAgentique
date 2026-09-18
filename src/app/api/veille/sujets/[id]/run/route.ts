import { NextResponse } from "next/server";
import { runSujet } from "@/core/veille/execution";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const resultat = await runSujet(params.id, "manuel");
    return NextResponse.json({ ok: true, resultat });
  } catch (erreur) {
    return NextResponse.json(
      { ok: false, erreurs: [erreur instanceof Error ? erreur.message : "Erreur inattendue."] },
      { status: 500 }
    );
  }
}
