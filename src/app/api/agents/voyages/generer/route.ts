import { NextResponse } from "next/server";
import { genererIcsVoyages } from "@/core/voyages/useCases";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const corps = await request.json().catch(() => ({}));
  const resultat = await genererIcsVoyages(corps.voyages);

  if (!resultat.ok) {
    return NextResponse.json(resultat);
  }

  return new Response(resultat.contenu, {
    headers: {
      "Content-Type": "text/calendar",
      "Content-Disposition": 'attachment; filename="voyages_sncf.ics"',
    },
  });
}
