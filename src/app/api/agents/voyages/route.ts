import { NextResponse } from "next/server";
import { getVoyagesSummary } from "@/core/agents/voyages";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getVoyagesSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 503 }
    );
  }
}
