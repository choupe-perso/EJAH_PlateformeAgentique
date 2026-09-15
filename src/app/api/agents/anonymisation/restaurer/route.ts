import { NextResponse } from "next/server";
import { restaurerDocument } from "@/core/anonymisation/useCases";
import { nomFichierValide, tailleValide } from "@/agents/anonymisation/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formulaire = await request.formData().catch(() => null);
  const fichier = formulaire?.get("fichier");
  if (!(fichier instanceof File)) {
    return NextResponse.json({ ok: false, erreurs: ["Aucun fichier fourni."] });
  }
  if (!nomFichierValide(fichier.name) || !tailleValide(fichier.size)) {
    return NextResponse.json({ ok: false, erreurs: ["Fichier invalide."] });
  }

  const contenu = Buffer.from(await fichier.arrayBuffer());
  const resultat = await restaurerDocument(fichier.name, contenu);
  if (!resultat.ok) {
    return NextResponse.json({ ok: false, erreurs: [resultat.erreur] });
  }

  return new Response(new Blob([Uint8Array.from(resultat.donnees.contenu)]), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${resultat.donnees.nomFichierSortie}"`,
    },
  });
}
