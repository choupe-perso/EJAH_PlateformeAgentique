import { NextResponse } from "next/server";
import { getRecupererProgress } from "@/core/agents/voyages";

export const dynamic = "force-dynamic";

export async function GET() {
  const phase = await getRecupererProgress();
  return NextResponse.json({ phase });
}
