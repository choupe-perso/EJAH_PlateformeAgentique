export type AppEnvironment = "dev" | "test" | "prod";

function parseAppEnvironment(value: string | undefined): AppEnvironment | null {
  if (value === "dev" || value === "test" || value === "prod") {
    return value;
  }
  return null;
}

export const appEnvironment = (): AppEnvironment => {
  const parsed = parseAppEnvironment(process.env.APP_ENV);
  if (!parsed) {
    throw new Error(
      "APP_ENV manquant ou invalide. Attendu 'dev' | 'test' | 'prod' (voir config/.env.*.example)."
    );
  }
  return parsed;
};

export const appEnvironmentOrNull = (): AppEnvironment | null =>
  parseAppEnvironment(process.env.APP_ENV);

// Dossier racine du worktree en cours d'execution - derive de process.cwd()
// (jamais code en dur : chaque environnement tourne depuis son propre
// worktree, donc cette valeur reflete toujours le bon dossier sans le
// nommer explicitement, y compris si la plateforme est un jour deplacee
// ou installee sur un autre poste).
export const racineProjet = (): string => process.cwd();

// Nom affiche dans le header de l'app - personnalisation optionnelle via
// .env.local (APP_DISPLAY_NAME), jamais codee en dur : "EJAH" reste le nom
// par defaut si la cle est absente (TEST/PROD notamment).
export const nomAffiche = (): string => process.env.APP_DISPLAY_NAME?.trim() || "EJAH";

// Jeton du declenchement externe de la veille (POST /api/veille/run/externe)
// - null si non configure, auquel cas la route doit refuser toute requete
// plutot que d'accepter un jeton vide.
export const veilleRunToken = (): string | null => process.env.VEILLE_RUN_TOKEN?.trim() || null;

// Version majeure affichee dans le header (ex. "10.0") - mise a jour
// manuellement dans .env.local a chaque tag de version majeure (dev-vX.0/
// test-vX.0/prod-vX.0), jamais deduite automatiquement d'un numero de
// build : la creation d'un tag reste un acte explicite de l'utilisateur.
export const appVersion = (): string | null => process.env.APP_VERSION?.trim() || null;
