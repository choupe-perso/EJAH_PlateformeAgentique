import { NextResponse } from "next/server";
import { getSynthese } from "@/core/veille/synthese";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const synthese = await getSynthese();
    return NextResponse.json({ ok: true, synthese });
  } catch {
    return NextResponse.json({ ok: false, erreurs: ["Base de données injoignable."] }, { status: 503 });
  }
}
