// Adaptateur vers le moteur Python d'anonymisation (python/anonymizer/),
// invoque en sous-processus - jamais importe directement, Next.js/webpack ne
// sait pas executer du Python. Le moteur tourne entierement en local (spaCy,
// regex, OCR ONNX) : aucun appel reseau a l'execution.

import { spawn } from "child_process";
import { join } from "path";
import { existsSync } from "fs";
import type { SpanAnonymisation } from "@/shared/anonymisationSpan";

const RACINE_MOTEUR = join(process.cwd(), "python", "anonymizer");
const PYTHON_EXE = join(RACINE_MOTEUR, ".venv", "Scripts", "python.exe");

export class MoteurAnonymisationIndisponibleError extends Error {}
export class PassphraseIncorrecteError extends Error {}

function verifierMoteurInstalle(): void {
  if (!existsSync(PYTHON_EXE)) {
    throw new MoteurAnonymisationIndisponibleError(
      "Le moteur Python d'anonymisation n'est pas installe (venv absent dans python/anonymizer/.venv). " +
        "Voir python/anonymizer/README.md pour l'installation."
    );
  }
}

function obtenirPassphrase(): string {
  const passphrase = process.env.ANONYMIZER_PASSPHRASE;
  if (!passphrase) {
    throw new MoteurAnonymisationIndisponibleError(
      "ANONYMIZER_PASSPHRASE n'est pas definie dans .env.local - impossible d'ouvrir le vault."
    );
  }
  return passphrase;
}

type ResultatCli = { code: number; stdout: string; stderr: string };

function executerCli(args: string[]): Promise<ResultatCli> {
  verifierMoteurInstalle();
  return new Promise((resolve, reject) => {
    const processus = spawn(PYTHON_EXE, ["-m", "anonymizer.cli", ...args], {
      cwd: RACINE_MOTEUR,
      env: { ...process.env, ANONYMIZER_PASSPHRASE: obtenirPassphrase() },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    processus.stdout.on("data", (chunk) => (stdout += chunk.toString("utf-8")));
    processus.stderr.on("data", (chunk) => (stderr += chunk.toString("utf-8")));
    processus.on("error", reject);
    processus.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

function analyserJson<T>(resultat: ResultatCli): T {
  let donnees: { ok: boolean; erreur?: string } & Record<string, unknown>;
  try {
    donnees = JSON.parse(resultat.stdout.trim());
  } catch {
    throw new Error(`Reponse inattendue du moteur d'anonymisation : ${resultat.stderr || resultat.stdout}`);
  }
  if (!donnees.ok) {
    const message = donnees.erreur ?? "Erreur inconnue du moteur d'anonymisation.";
    if (message.includes("Passphrase incorrecte")) {
      throw new PassphraseIncorrecteError(message);
    }
    throw new Error(message);
  }
  return donnees as T;
}

export async function inspecter(
  cheminEntree: string,
  avecImages: boolean
): Promise<SpanAnonymisation[]> {
  const args = ["inspect", cheminEntree, "--json"];
  if (!avecImages) args.push("--no-images");
  const resultat = await executerCli(args);
  const donnees = analyserJson<{ spans: SpanAnonymisation[] }>(resultat);
  return donnees.spans;
}

export async function anonymiser(
  cheminEntree: string,
  cheminVault: string,
  cheminSortie: string,
  avecImages: boolean
): Promise<{ cheminSortie: string; spans: SpanAnonymisation[] }> {
  const args = ["anonymize", cheminEntree, "--vault", cheminVault, "--out", cheminSortie, "--json"];
  if (!avecImages) args.push("--no-images");
  const resultat = await executerCli(args);
  const donnees = analyserJson<{ outPath: string; spans: SpanAnonymisation[] }>(resultat);
  return { cheminSortie: donnees.outPath, spans: donnees.spans };
}

export async function restaurer(
  cheminEntree: string,
  cheminVault: string,
  cheminSortie: string
): Promise<{ cheminSortie: string }> {
  const resultat = await executerCli([
    "deanonymize",
    cheminEntree,
    "--vault",
    cheminVault,
    "--out",
    cheminSortie,
    "--json",
  ]);
  const donnees = analyserJson<{ outPath: string }>(resultat);
  return { cheminSortie: donnees.outPath };
}
