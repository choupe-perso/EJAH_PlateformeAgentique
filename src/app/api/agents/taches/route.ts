import { NextResponse } from "next/server";
import { getTachesSummary } from "@/core/agents/taches";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getTachesSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 503 }
    );
  }
}
