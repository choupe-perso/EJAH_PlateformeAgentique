import { NextResponse } from "next/server";
import { construirePromptManuel } from "@/core/veille/qualification";
import type { ContratChamps } from "@/shared/veille/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const corps = await request.json().catch(() => ({}));
  const sujet = (corps.sujet ?? "").trim();
  const contratActuel = (corps.contratActuel as ContratChamps | undefined) ?? undefined;

  if (!sujet) {
    return NextResponse.json({ ok: false, erreurs: ["Sujet requis."] }, { status: 400 });
  }

  const prompt = construirePromptManuel(sujet, contratActuel);
  return NextResponse.json({ ok: true, prompt });
}
