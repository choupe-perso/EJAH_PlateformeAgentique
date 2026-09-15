// Contrat de validation pour l'agent Anonymisation.

export const TAILLE_MAX_OCTETS = 25 * 1024 * 1024; // 25 Mo

export function nomFichierValide(nom: string): boolean {
  if (!nom || nom.length > 255) return false;
  // Pas de separateur de chemin ni de remontee de dossier : le nom sert
  // directement a construire un chemin dans un dossier de travail temporaire.
  return !/[\\/]|\.\./.test(nom);
}

export function tailleValide(taille: number): boolean {
  return taille > 0 && taille <= TAILLE_MAX_OCTETS;
}
