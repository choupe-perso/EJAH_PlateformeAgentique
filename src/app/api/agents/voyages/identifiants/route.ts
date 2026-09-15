import { NextResponse } from "next/server";
import { identifiantsConfigures } from "@/core/voyages/useCases";

export const dynamic = "force-dynamic";

// Pas de POST ici volontairement : la plateforme n'accepte jamais les
// identifiants SNCF Connect via HTTP. Ils sont enregistres uniquement en
// local via `node deployment/enregistrer-identifiants-sncf.mjs`.
export async function GET() {
  return NextResponse.json({ ok: true, configures: identifiantsConfigures() });
}
