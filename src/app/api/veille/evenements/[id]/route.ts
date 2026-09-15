import { NextResponse } from "next/server";
import { marquerLu, marquerNonLu } from "@/core/veille/lecture";
import { getTraceabilite } from "@/core/veille/traceabilite";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const traceabilite = await getTraceabilite(params.id);
  if (!traceabilite) return NextResponse.json({ ok: false, erreurs: ["Événement introuvable."] }, { status: 404 });
  return NextResponse.json({ ok: true, traceabilite });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const corps = await request.json().catch(() => ({}));
  if (corps.lu === false) {
    await marquerNonLu(params.id);
  } else {
    await marquerLu(params.id);
  }
  return NextResponse.json({ ok: true });
}
