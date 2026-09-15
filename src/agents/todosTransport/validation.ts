// Regles de validation des taches de l'agent Taches, par type (rdv/email/prompt).
// Porte depuis l'ancienne plateforme Flask (agents/todos_transport/validation.py).
//
// Chaque fonction retourne une liste d'erreurs (liste vide = parametres
// exploitables).

export const ALERTES_VALIDES_MINUTES = [5, 10, 30, 60, 120] as const;
export const IA_VALIDES = ["chatgpt", "copilot", "gemini", "claude"] as const;

export type DonneesRdv = {
  titre?: string;
  dateDebut?: string;
  dureeMinutes?: number | string;
  alerteMinutes?: number | string;
};

export function validerRdv(donnees: DonneesRdv): string[] {
  const erreurs: string[] = [];

  if (!(donnees.titre ?? "").trim()) {
    erreurs.push("Le titre du RDV est requis.");
  }
  if (!(donnees.dateDebut ?? "").trim()) {
    erreurs.push("La date de debut est requise.");
  }

  const duree = Number(donnees.dureeMinutes);
  if (!Number.isFinite(duree) || duree <= 0) {
    erreurs.push("La duree doit etre un nombre de minutes strictement positif.");
  }

  const alerte = Number(donnees.alerteMinutes);
  if (!ALERTES_VALIDES_MINUTES.includes(alerte as (typeof ALERTES_VALIDES_MINUTES)[number])) {
    erreurs.push(
      `L'alerte doit etre l'une des valeurs suivantes (en minutes) : ${ALERTES_VALIDES_MINUTES.join(", ")}.`
    );
  }

  return erreurs;
}

export type DonneesEmail = {
  destinataire?: string;
  titre?: string;
  texte?: string;
};

export function validerEmail(donnees: DonneesEmail): string[] {
  const erreurs: string[] = [];

  if (!(donnees.destinataire ?? "").trim()) {
    erreurs.push("Le destinataire est requis.");
  }
  if (!(donnees.titre ?? "").trim()) {
    erreurs.push("Le titre de l'email est requis (genere un brouillon ou saisis-le a la main).");
  }
  if (!(donnees.texte ?? "").trim()) {
    erreurs.push("Le texte de l'email est requis (genere un brouillon ou saisis-le a la main).");
  }

  return erreurs;
}

export type DonneesPrompt = {
  ia?: string;
  projet?: string;
  titre?: string;
  texte?: string;
};

export function validerPrompt(donnees: DonneesPrompt): string[] {
  const erreurs: string[] = [];

  const ia = (donnees.ia ?? "").trim().toLowerCase();
  if (!IA_VALIDES.includes(ia as (typeof IA_VALIDES)[number])) {
    erreurs.push(`L'IA cible doit etre l'une des suivantes : ${IA_VALIDES.join(", ")}.`);
  }
  if (!(donnees.projet ?? "").trim()) {
    erreurs.push("Le projet est requis.");
  }
  if (!(donnees.titre ?? "").trim()) {
    erreurs.push("Le titre est requis.");
  }
  if (!(donnees.texte ?? "").trim()) {
    erreurs.push("Le texte du prompt est requis (genere un brouillon ou saisis-le a la main).");
  }

  return erreurs;
}

export function validerTache(
  typeTache: string,
  donnees: DonneesRdv | DonneesEmail | DonneesPrompt
): string[] {
  if (typeTache === "rdv") return validerRdv(donnees as DonneesRdv);
  if (typeTache === "email") return validerEmail(donnees as DonneesEmail);
  if (typeTache === "prompt") return validerPrompt(donnees as DonneesPrompt);
  return [`Type de tache inconnu : ${JSON.stringify(typeTache)}.`];
}
