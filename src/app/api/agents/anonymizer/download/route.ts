import { NextResponse } from "next/server";
import { downloadAnonymizerArtifact } from "@/core/agents/anonymizer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const gatewayPath = new URL(request.url).searchParams.get("path");
  if (!gatewayPath) {
    return NextResponse.json({ error: "Paramètre 'path' manquant." }, { status: 400 });
  }

  try {
    const data = await downloadAnonymizerArtifact(gatewayPath);
    const filename = gatewayPath.split("/").pop() ?? "fichier";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 404 }
    );
  }
}
