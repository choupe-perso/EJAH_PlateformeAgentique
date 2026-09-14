// Redaction assistee (email / prompt) pour l'agent Taches, via Ollama local.
// Porte depuis l'ancienne plateforme Flask (agents/todos_transport/ollama_client.py).
//
// Les regles redactionnelles (role, regles, style personnel, parametres) sont
// externalisees en fichiers texte sous prompts/todos-transport/ plutot que
// codees en dur ici : modifier le ton, le style ou les regles se fait en
// editant ces fichiers .txt, sans toucher au code.

import { readFileSync } from "fs";
import { join } from "path";
import { appelOllama, extraireTitreTexte } from "./client";

const PROMPTS_DIR = join(process.cwd(), "src", "integrations", "ollama", "prompts", "todos-transport");

const FORMAT_EMAIL =
  "Reponds STRICTEMENT sous cette forme, sans rien ajouter avant ou apres :\n" +
  "TITRE: <objet de l'email>\n" +
  "TEXTE:\n<corps de l'email>";
const FORMAT_PROMPT = "Reponds uniquement avec le texte final, sans aucun commentaire avant ou apres.";

function chargerFragment(cheminRelatif: string): string {
  try {
    return readFileSync(join(PROMPTS_DIR, cheminRelatif), "utf-8").trim();
  } catch {
    return "";
  }
}

function section(titre: string, contenu: string): string {
  return contenu ? `[${titre}]\n${contenu}` : "";
}

function assembler(...sections: string[]): string {
  return sections.filter(Boolean).join("\n\n");
}

export type Registre = "tutoiement" | "vouvoiement";
export type Ton = "formel" | "professionnel" | "proche" | "amical";
export type LongueurMail = "tres_court" | "court" | "developpe";
export type NiveauPrompt = "rapide" | "structure" | "complet" | "expert";

function preambuleMail(registre: Registre, ton: Ton, longueur: LongueurMail): string {
  const parametres = assembler(
    chargerFragment(`mail/relation/${registre}.txt`),
    chargerFragment(`mail/ton/${ton}.txt`),
    chargerFragment(`mail/longueur/${longueur}.txt`)
  );
  return assembler(
    section("ROLE", chargerFragment("mail/role.txt")),
    section("REGLES", chargerFragment("mail/regles.txt")),
    section("STYLE PERSONNEL", chargerFragment("commun/style.txt")),
    section("PARAMETRES", parametres)
  );
}

function preambulePrompt(niveau: NiveauPrompt): string {
  return assembler(
    section("ROLE", chargerFragment("prompt/role.txt")),
    section("REGLES", chargerFragment("prompt/regles.txt")),
    section("STYLE PERSONNEL", chargerFragment("commun/style.txt")),
    section("PARAMETRES", chargerFragment(`prompt/niveau/${niveau}.txt`))
  );
}

export type BrouillonMail = { titre: string; texte: string; prompt: string };
export type BrouillonPrompt = { texte: string; prompt: string };

export async function redigerEmail(params: {
  destinataire: string;
  notes: string;
  registre: Registre;
  ton: Ton;
  longueur: LongueurMail;
}): Promise<BrouillonMail> {
  const demande = section(
    "DEMANDE UTILISATEUR",
    `<<<\nDestinataire : ${params.destinataire}\n` +
      `Notes de l'expediteur (ce qu'il veut dire, a transformer en message) : ${params.notes}\n>>>`
  );
  const prompt = assembler(preambuleMail(params.registre, params.ton, params.longueur), demande, FORMAT_EMAIL);
  const { titre, texte } = extraireTitreTexte(await appelOllama(prompt));
  return { titre, texte, prompt };
}

export async function reecrireEmail(params: {
  destinataire: string;
  titreActuel: string;
  texteActuel: string;
  precisions: string;
  registre: Registre;
  ton: Ton;
  longueur: LongueurMail;
}): Promise<BrouillonMail> {
  const demande = section(
    "DEMANDE UTILISATEUR",
    `<<<\nDestinataire : ${params.destinataire}\n` +
      `Brouillon actuel — titre : ${params.titreActuel}\n` +
      `Brouillon actuel — texte :\n${params.texteActuel}\n\n` +
      `Precisions pour la reecriture : ${params.precisions}\n>>>`
  );
  const prompt = assembler(preambuleMail(params.registre, params.ton, params.longueur), demande, FORMAT_EMAIL);
  const { titre, texte } = extraireTitreTexte(await appelOllama(prompt));
  return { titre, texte, prompt };
}

export async function redigerPrompt(params: {
  ia: string;
  projet: string;
  titre: string;
  notes: string;
  niveau: NiveauPrompt;
}): Promise<BrouillonPrompt> {
  const demande = section(
    "DEMANDE UTILISATEUR",
    `<<<\nIA cible : ${params.ia}\nProjet : ${params.projet}\nTitre : ${params.titre}\n` +
      `Notes de l'utilisateur (ce qu'il veut dire, a transformer en prompt) : ${params.notes}\n>>>`
  );
  const prompt = assembler(preambulePrompt(params.niveau), demande, FORMAT_PROMPT);
  const texte = (await appelOllama(prompt)).trim();
  return { texte, prompt };
}

export async function reecrirePrompt(params: {
  ia: string;
  projet: string;
  titre: string;
  texteActuel: string;
  precisions: string;
  niveau: NiveauPrompt;
}): Promise<BrouillonPrompt> {
  const demande = section(
    "DEMANDE UTILISATEUR",
    `<<<\nIA cible : ${params.ia}\nProjet : ${params.projet}\nTitre : ${params.titre}\n` +
      `Prompt actuel :\n${params.texteActuel}\n\n` +
      `Precisions pour la reecriture : ${params.precisions}\n>>>`
  );
  const prompt = assembler(preambulePrompt(params.niveau), demande, FORMAT_PROMPT);
  const texte = (await appelOllama(prompt)).trim();
  return { texte, prompt };
}
