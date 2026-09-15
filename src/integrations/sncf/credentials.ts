// Stockage des identifiants SNCF Connect dans le Gestionnaire d'identifiants
// Windows (jamais en clair ailleurs, jamais transmis en dehors de cette
// machine). Porte depuis l'ancienne plateforme Flask
// (agents/generateur_ics_sncf/scraping.py), qui utilisait keyring (Python) -
// meme principe ici via @napi-rs/keyring.

import { Entry } from "@napi-rs/keyring";

const SERVICE_NAME = "EJAH-IcsSncf";
const EMAIL_KEY = "sncf_email";

export function enregistrerIdentifiants(email: string, motDePasse: string): void {
  new Entry(SERVICE_NAME, EMAIL_KEY).setPassword(email);
  new Entry(SERVICE_NAME, email).setPassword(motDePasse);
}

export function obtenirIdentifiants(): { email: string; motDePasse: string } | null {
  const email = new Entry(SERVICE_NAME, EMAIL_KEY).getPassword();
  if (!email) return null;
  const motDePasse = new Entry(SERVICE_NAME, email).getPassword();
  if (!motDePasse) return null;
  return { email, motDePasse };
}

export function identifiantsConfigures(): boolean {
  return obtenirIdentifiants() !== null;
}
