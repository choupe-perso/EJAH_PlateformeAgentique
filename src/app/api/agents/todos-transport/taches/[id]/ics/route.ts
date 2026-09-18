import { NextResponse } from "next/server";
import { genererIcsPourTache } from "@/core/todosTransport/useCases";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const contenu = await genererIcsPourTache(params.id);
  if (!contenu) {
    return NextResponse.json({ ok: false, erreurs: ["RDV introuvable."] }, { status: 404 });
  }

  return new Response(contenu, {
    headers: {
      "Content-Type": "text/calendar",
      "Content-Disposition": `attachment; filename="rdv_${params.id}.ics"`,
    },
  });
}
