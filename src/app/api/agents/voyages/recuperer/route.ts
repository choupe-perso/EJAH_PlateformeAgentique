import { NextResponse } from "next/server";
import { recupererVoyages } from "@/core/agents/voyages";

export const dynamic = "force-dynamic";
// Peut bloquer jusqu'à 5 minutes (session Chrome interactive, voir
// core/agents/voyages.ts) - pas de timeout à imposer ici, le serveur
// Next.js tourne en local (next dev/start), pas en fonction serverless.
export const maxDuration = 300;

export async function POST() {
  try {
    const result = await recupererVoyages();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 400 }
    );
  }
}
