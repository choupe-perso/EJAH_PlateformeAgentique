import { NextResponse } from "next/server";
import { marquerTraite } from "@/core/agents/taches";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const trouve = await marquerTraite(params.id);
  if (!trouve) {
    return NextResponse.json({ ok: false, erreurs: ["Tâche introuvable."] }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
