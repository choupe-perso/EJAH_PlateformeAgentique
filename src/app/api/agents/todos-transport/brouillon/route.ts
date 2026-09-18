import { NextResponse } from "next/server";
import {
  redigerBrouillonEmail,
  reecrireBrouillonEmail,
  redigerBrouillonPrompt,
  reecrireBrouillonPrompt,
} from "@/core/todosTransport/useCases";
import { OllamaError } from "@/integrations/ollama/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const corps = await request.json().catch(() => ({}));
  const typeTache = corps.type;

  try {
    if (typeTache === "email") {
      const precisions = (corps.precisions ?? "").trim();
      const resultat = precisions
        ? await reecrireBrouillonEmail({
            destinataire: corps.destinataire ?? "",
            titreActuel: corps.titreActuel ?? "",
            texteActuel: corps.texteActuel ?? "",
            precisions,
            registre: corps.registre,
            ton: corps.ton,
            longueur: corps.longueur,
          })
        : await redigerBrouillonEmail({
            destinataire: corps.destinataire ?? "",
            notes: corps.notes ?? "",
            registre: corps.registre,
            ton: corps.ton,
            longueur: corps.longueur,
          });
      return NextResponse.json({ ok: true, ...resultat });
    }

    if (typeTache === "prompt") {
      const precisions = (corps.precisions ?? "").trim();
      const resultat = precisions
        ? await reecrireBrouillonPrompt({
            ia: corps.ia ?? "",
            projet: corps.projet ?? "",
            titre: corps.titre ?? "",
            texteActuel: corps.texteActuel ?? "",
            precisions,
            niveau: corps.niveau,
          })
        : await redigerBrouillonPrompt({
            ia: corps.ia ?? "",
            projet: corps.projet ?? "",
            titre: corps.titre ?? "",
            notes: corps.notes ?? "",
            niveau: corps.niveau,
          });
      return NextResponse.json({ ok: true, ...resultat });
    }

    return NextResponse.json({ ok: false, erreurs: ["Type de tache inconnu pour un brouillon."] }, { status: 400 });
  } catch (erreur) {
    if (erreur instanceof OllamaError) {
      return NextResponse.json({ ok: false, erreurs: [erreur.message] });
    }
    throw erreur;
  }
}
