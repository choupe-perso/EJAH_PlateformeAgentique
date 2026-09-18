// Declenchement externe (equivalent Airflow) - protege par un jeton partage
// lu uniquement cote serveur (VEILLE_RUN_TOKEN, jamais envoye au
// navigateur). Delegue a la MEME fonction core/veille/execution.runGlobal
// que le bouton manuel - comportement metier identique quel que soit le
// declencheur (EXG-032, CA-011). Airflow n'est PAS une dependance : cette
// route est un simple webhook HTTP, appelable par n'importe quel
// orchestrateur ou script.

import { NextResponse } from "next/server";
import { runGlobal } from "@/core/veille/execution";
import { veilleRunToken } from "@/shared/env";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const jetonAttendu = veilleRunToken();
  if (!jetonAttendu) {
    return NextResponse.json(
      { ok: false, erreurs: ["VEILLE_RUN_TOKEN non configuré côté serveur."] },
      { status: 503 }
    );
  }

  const enTete = request.headers.get("authorization") ?? "";
  const jetonRecu = enTete.startsWith("Bearer ") ? enTete.slice(7) : "";
  if (jetonRecu !== jetonAttendu) {
    return NextResponse.json({ ok: false, erreurs: ["Jeton invalide."] }, { status: 401 });
  }

  try {
    const resultat = await runGlobal("externe");
    return NextResponse.json({ ok: true, resultat });
  } catch (erreur) {
    return NextResponse.json(
      { ok: false, erreurs: [erreur instanceof Error ? erreur.message : "Erreur inattendue."] },
      { status: 500 }
    );
  }
}
