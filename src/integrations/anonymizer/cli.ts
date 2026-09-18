// Adaptateur vers le moteur Python d'anonymisation (python/anonymizer/),
// invoque en sous-processus - jamais importe directement, Next.js/webpack ne
// sait pas executer du Python. Le moteur tourne entierement en local (spaCy,
// regex, OCR ONNX) : aucun appel reseau a l'execution.
//
// v2.0.0 du moteur (2026-09-16) : l'OCR des images embarquees est toujours
// actif (l'ancien --no-images/avecImages a disparu du moteur), docx/pptx/
// xlsx sont desormais entierement restaurables (avant : .txt uniquement),
// le PDF est supporte en entree (converti en .docx). `--json` n'existe plus
// que sur `inspect` - patch EJAH documente dans python/anonymizer/src/
// anonymizer/cli.py, car anonymize/deanonymize n'en ont pas besoin (chemin
// de sortie impose via --out, decompte lu sur la ligne humaine).

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

function erreurDepuisStderr(resultat: ResultatCli): Error {
  const message = resultat.stderr.trim() || resultat.stdout.trim() || "Erreur inconnue du moteur d'anonymisation.";
  if (message.includes("Passphrase incorrecte")) {
    return new PassphraseIncorrecteError(message);
  }
  return new Error(message);
}

export async function inspecter(cheminEntree: string): Promise<SpanAnonymisation[]> {
  const resultat = await executerCli(["inspect", cheminEntree, "--json"]);
  let donnees: { ok: boolean; erreur?: string; spans?: SpanAnonymisation[] };
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
  return donnees.spans ?? [];
}

export async function anonymiser(
  cheminEntree: string,
  cheminVault: string,
  cheminSortie: string
): Promise<{ nbEntites: number }> {
  // --out impose toujours le chemin de sortie exact (le moteur ne
  // recalcule un nom par defaut - ex. ".anon.docx" force pour une entree
  // .pdf, voir pdf_handler.py - que lorsque --out est omis, jamais le cas
  // ici) : pas besoin de reparser le chemin depuis la sortie humaine.
  const resultat = await executerCli(["anonymize", cheminEntree, "--vault", cheminVault, "--out", cheminSortie]);
  if (resultat.code !== 0) throw erreurDepuisStderr(resultat);
  const correspondance = /^(\d+)\s+entit/.exec(resultat.stdout.trim());
  return { nbEntites: correspondance ? Number(correspondance[1]) : 0 };
}

export async function restaurer(cheminEntree: string, cheminVault: string, cheminSortie: string): Promise<void> {
  const resultat = await executerCli(["deanonymize", cheminEntree, "--vault", cheminVault, "--out", cheminSortie]);
  if (resultat.code !== 0) throw erreurDepuisStderr(resultat);
}
