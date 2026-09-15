// Enregistre les identifiants SNCF Connect dans le Gestionnaire
// d'identifiants Windows, en dehors de la plateforme (jamais saisis dans
// un formulaire web, jamais transmis en HTTP). A executer depuis un
// terminal, a la racine de ce worktree :
//
//   node deployment/enregistrer-identifiants-sncf.mjs
//
// Meme mecanisme de stockage que src/integrations/sncf/credentials.ts
// (memes constantes SERVICE_NAME/EMAIL_KEY) - duplique ici volontairement
// car ce script tourne hors du build Next.js et ne peut pas importer les
// alias @/ du projet.

import { createInterface } from "readline";
import { Entry } from "@napi-rs/keyring";

const SERVICE_NAME = "EJAH-IcsSncf";
const EMAIL_KEY = "sncf_email";

function lireEmail(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (reponse) => {
      rl.close();
      resolve(reponse.trim());
    });
  });
}

// Lecture en mode brut, caractere par caractere, pour masquer la saisie.
// Utilise uniquement pour le mot de passe, une seule fois - pas de file
// d'attente de questions, donc pas d'ambiguite sur l'etat du buffer.
function lireMotDePasseMasque(question) {
  return new Promise((resolve) => {
    const isTTY = Boolean(process.stdin.isTTY);
    let tampon = "";

    process.stdout.write(question);
    process.stdin.setEncoding("utf8");
    if (isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();

    function nettoyer() {
      process.stdin.removeListener("data", surDonnees);
      if (isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    function surDonnees(chunk) {
      for (const car of chunk) {
        if (car === "") {
          nettoyer();
          process.exit(1); // Ctrl+C
        }
        if (car === "\n" || car === "\r") {
          process.stdout.write("\n");
          nettoyer();
          resolve(tampon.trim());
          return;
        }
        if (car === "" || car === "\b") {
          if (tampon.length > 0) {
            tampon = tampon.slice(0, -1);
            if (isTTY) process.stdout.write("\b \b");
          }
          continue;
        }
        tampon += car;
        if (isTTY) process.stdout.write("*");
      }
    }

    process.stdin.on("data", surDonnees);
  });
}

const email = await lireEmail("Email SNCF Connect : ");
if (!email) {
  console.error("Email vide - annule.");
  process.exit(1);
}

const motDePasse = await lireMotDePasseMasque("Mot de passe (masque) : ");
if (!motDePasse) {
  console.error("Mot de passe vide - annule.");
  process.exit(1);
}

new Entry(SERVICE_NAME, EMAIL_KEY).setPassword(email);
new Entry(SERVICE_NAME, email).setPassword(motDePasse);

const verifEmail = new Entry(SERVICE_NAME, EMAIL_KEY).getPassword();
const verifMdp = verifEmail ? new Entry(SERVICE_NAME, verifEmail).getPassword() : null;

if (verifEmail === email && verifMdp === motDePasse) {
  console.log("Identifiants enregistres et verifies dans le Gestionnaire d'identifiants Windows.");
} else {
  console.error("Echec de la verification apres enregistrement.");
  process.exit(1);
}
