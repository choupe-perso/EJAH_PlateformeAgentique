import { NextResponse } from "next/server";
import { getAnonymizerSummary, LEGAL_DISCLAIMER } from "@/core/agents/anonymizer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getAnonymizerSummary();
    return NextResponse.json({ ...summary, legal_disclaimer: LEGAL_DISCLAIMER });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 503 }
    );
  }
}
