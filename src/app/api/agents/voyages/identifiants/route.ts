import { NextResponse } from "next/server";
import { enregistrerIdentifiants, identifiantsConfigures } from "@/core/voyages/useCases";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, configures: identifiantsConfigures() });
}

export async function POST(request: Request) {
  const corps = await request.json().catch(() => ({}));
  const email = (corps.email ?? "").trim();
  const motDePasse = corps.motDePasse ?? "";

  if (!email || !motDePasse) {
    return NextResponse.json({ ok: false, erreurs: ["Email et mot de passe sont requis."] });
  }

  await enregistrerIdentifiants(email, motDePasse);
  return NextResponse.json({ ok: true });
}
