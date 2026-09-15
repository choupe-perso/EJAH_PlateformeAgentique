import { NextResponse } from "next/server";
import { inspecterDocument } from "@/core/anonymisation/useCases";
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

  const avecImages = formulaire?.get("avecImages") !== "false";
  const contenu = Buffer.from(await fichier.arrayBuffer());
  const resultat = await inspecterDocument(fichier.name, contenu, avecImages);
  if (!resultat.ok) {
    return NextResponse.json({ ok: false, erreurs: [resultat.erreur] });
  }
  return NextResponse.json({ ok: true, spans: resultat.donnees.spans });
}
