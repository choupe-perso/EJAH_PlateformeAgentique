import { NextResponse } from "next/server";
import { runAnonymizerCommand, type AnonymizerFileInput } from "@/core/agents/anonymizer";

export const dynamic = "force-dynamic";

async function toFileInput(file: File): Promise<AnonymizerFileInput> {
  return {
    filename: file.name,
    data: Buffer.from(await file.arrayBuffer()),
    contentType: file.type || undefined,
  };
}

export async function POST(request: Request) {
  const form = await request.formData();

  const command = form.get("command");
  if (command !== "inspect" && command !== "anonymize" && command !== "deanonymize") {
    return NextResponse.json({ error: "Commande invalide." }, { status: 400 });
  }

  const documentFiles = form.getAll("documents").filter((v): v is File => v instanceof File);
  const vaultFile = form.get("vault");

  try {
    const result = await runAnonymizerCommand({
      command,
      consentAdbi: form.get("consent_adbi") === "true",
      consentDisclaimer: form.get("consent_disclaimer") === "true",
      documents: await Promise.all(documentFiles.map(toFileInput)),
      vault: vaultFile instanceof File ? await toFileInput(vaultFile) : undefined,
      passphrase: (form.get("passphrase") as string | null) ?? undefined,
      irreversible: form.get("irreversible") === "true",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur inconnue" },
      { status: 400 }
    );
  }
}
