import { NextResponse } from "next/server";
import { genererIcs, type Voyage } from "@/core/agents/voyages";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const voyages = Array.isArray(body.voyages) ? (body.voyages as Voyage[]) : [];

  try {
    const result = await genererIcs(voyages);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 400 }
    );
  }
}
