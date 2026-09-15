// Declenchement manuel global (bouton "Lancer la veille") - meme origine,
// pas de jeton. Delegue a core/veille/execution.runGlobal, identique a la
// route externe protegee par jeton (aucune logique dupliquee).

import { NextResponse } from "next/server";
import { runGlobal } from "@/core/veille/execution";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const resultat = await runGlobal("manuel");
    return NextResponse.json({ ok: true, resultat });
  } catch (erreur) {
    return NextResponse.json(
      { ok: false, erreurs: [erreur instanceof Error ? erreur.message : "Erreur inattendue."] },
      { status: 500 }
    );
  }
}
