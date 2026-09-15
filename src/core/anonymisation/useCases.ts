// Cas d'usage de l'agent Anonymisation - orchestre integrations/anonymizer
// (moteur Python local), appele par les routes API.

import { join, extname } from "path";
import { mkdir, writeFile, readFile, rm } from "fs/promises";
import { randomUUID } from "crypto";
import {
  inspecter as inspecterCli,
  anonymiser as anonymiserCli,
  restaurer as restaurerCli,
  MoteurAnonymisationIndisponibleError,
  PassphraseIncorrecteError,
} from "@/integrations/anonymizer/cli";
import type { SpanAnonymisation } from "@/shared/anonymisationSpan";
import { enregistrerHistorique } from "@/data/actionHistory";

const FORMATS_SUPPORTES = [".txt", ".docx", ".pptx", ".xlsx"];
const FORMATS_RESTAURABLES = [".txt"];

const BASE_LOCALE = join(process.env.LOCALAPPDATA || process.env.HOME || ".", "EJAH");
const VAULT_PATH = join(BASE_LOCALE, "anonymisation_vault.db");
const TRAVAIL_DIR = join(BASE_LOCALE, "anonymisation_tmp");

type Resultat<T> = { ok: true; donnees: T } | { ok: false; erreur: string };

function logHistorique(message: string, statut: "succes" | "erreur" = "succes") {
  return enregistrerHistorique({
    universe: "agents",
    actionType: "anonymisation",
    description: statut === "erreur" ? `[erreur] ${message}` : message,
  });
}

function messageErreur(erreur: unknown): string {
  if (erreur instanceof PassphraseIncorrecteError) {
    return "Passphrase incorrecte pour ce vault (ANONYMIZER_PASSPHRASE dans .env.local).";
  }
  if (erreur instanceof MoteurAnonymisationIndisponibleError) {
    return erreur.message;
  }
  return erreur instanceof Error ? erreur.message : "Erreur inattendue.";
}

export function formatsSupportes(): string[] {
  return FORMATS_SUPPORTES;
}

export function formatSupporte(nomFichier: string): boolean {
  return FORMATS_SUPPORTES.includes(extname(nomFichier).toLowerCase());
}

export function formatRestaurable(nomFichier: string): boolean {
  return FORMATS_RESTAURABLES.includes(extname(nomFichier).toLowerCase());
}

async function avecDossierTemporaire<T>(fn: (dossier: string) => Promise<T>): Promise<T> {
  const dossier = join(TRAVAIL_DIR, randomUUID());
  await mkdir(dossier, { recursive: true });
  try {
    return await fn(dossier);
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
}

export async function inspecterDocument(
  nomFichier: string,
  contenu: Buffer,
  avecImages: boolean
): Promise<Resultat<{ spans: SpanAnonymisation[] }>> {
  if (!formatSupporte(nomFichier)) {
    return { ok: false, erreur: `Format non supporte : ${extname(nomFichier)}` };
  }
  try {
    const spans = await avecDossierTemporaire(async (dossier) => {
      const cheminEntree = join(dossier, nomFichier);
      await writeFile(cheminEntree, contenu);
      return inspecterCli(cheminEntree, avecImages);
    });
    await logHistorique(`${spans.length} entite(s) detectee(s) dans "${nomFichier}" (inspection).`);
    return { ok: true, donnees: { spans } };
  } catch (erreur) {
    const message = messageErreur(erreur);
    await logHistorique(`Inspection de "${nomFichier}" : ${message}`, "erreur");
    return { ok: false, erreur: message };
  }
}

export async function anonymiserDocument(
  nomFichier: string,
  contenu: Buffer,
  avecImages: boolean
): Promise<Resultat<{ nomFichierSortie: string; contenu: Buffer; spans: SpanAnonymisation[] }>> {
  if (!formatSupporte(nomFichier)) {
    return { ok: false, erreur: `Format non supporte : ${extname(nomFichier)}` };
  }
  try {
    const resultat = await avecDossierTemporaire(async (dossier) => {
      const cheminEntree = join(dossier, nomFichier);
      await writeFile(cheminEntree, contenu);
      const nomSortie = `anonymise_${nomFichier}`;
      const cheminSortie = join(dossier, nomSortie);
      const { spans } = await anonymiserCli(cheminEntree, VAULT_PATH, cheminSortie, avecImages);
      const contenuSortie = await readFile(cheminSortie);
      return { nomFichierSortie: nomSortie, contenu: contenuSortie, spans };
    });
    await logHistorique(`${resultat.spans.length} entite(s) anonymisee(s) dans "${nomFichier}".`);
    return { ok: true, donnees: resultat };
  } catch (erreur) {
    const message = messageErreur(erreur);
    await logHistorique(`Anonymisation de "${nomFichier}" : ${message}`, "erreur");
    return { ok: false, erreur: message };
  }
}

export async function restaurerDocument(
  nomFichier: string,
  contenu: Buffer
): Promise<Resultat<{ nomFichierSortie: string; contenu: Buffer }>> {
  if (!formatRestaurable(nomFichier)) {
    return {
      ok: false,
      erreur: "Seuls les fichiers .txt peuvent etre restaures automatiquement.",
    };
  }
  try {
    const resultat = await avecDossierTemporaire(async (dossier) => {
      const cheminEntree = join(dossier, nomFichier);
      await writeFile(cheminEntree, contenu);
      const nomSortie = `restaure_${nomFichier}`;
      const cheminSortie = join(dossier, nomSortie);
      await restaurerCli(cheminEntree, VAULT_PATH, cheminSortie);
      const contenuSortie = await readFile(cheminSortie);
      return { nomFichierSortie: nomSortie, contenu: contenuSortie };
    });
    await logHistorique(`Fichier "${nomFichier}" restaure.`);
    return { ok: true, donnees: resultat };
  } catch (erreur) {
    const message = messageErreur(erreur);
    await logHistorique(`Restauration de "${nomFichier}" : ${message}`, "erreur");
    return { ok: false, erreur: message };
  }
}
