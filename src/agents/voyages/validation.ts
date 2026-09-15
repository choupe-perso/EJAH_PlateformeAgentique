// Validation des voyages selectionnes par l'utilisateur avant generation du
// calendrier. Porte depuis l'ancienne plateforme Flask
// (agents/generateur_ics_sncf/routes.py, CHAMPS_VOYAGE_REQUIS).

const CHAMPS_VOYAGE_REQUIS = [
  "id",
  "dossier",
  "annee",
  "mois",
  "jour",
  "heureDepart",
  "heureArrivee",
  "gareDepart",
  "gareArrivee",
  "trainNumero",
  "duree",
] as const;

export function validerVoyage(voyage: unknown): boolean {
  if (typeof voyage !== "object" || voyage === null) return false;
  return CHAMPS_VOYAGE_REQUIS.every((champ) => champ in voyage);
}
