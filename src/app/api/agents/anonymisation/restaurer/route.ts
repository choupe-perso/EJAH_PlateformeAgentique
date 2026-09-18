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

  // application/octet-stream, pas text/plain : depuis que docx/pptx/xlsx
  // sont restaurables (v2.0.0 du moteur, pas seulement .txt), un type fixe
  // text/plain serait faux pour ces formats - le nom de fichier (Content-
  // Disposition) suffit au navigateur/OS pour l'association d'ouverture.
  return new Response(new Blob([Uint8Array.from(resultat.donnees.contenu)]), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${resultat.donnees.nomFichierSortie}"`,
    },
  });
}
