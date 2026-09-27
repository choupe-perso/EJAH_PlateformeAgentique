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

// Version majeure affichee dans le header (ex. "10.0") - mise a jour
// manuellement dans .env.local a chaque tag de version majeure (dev-vX.0/
// test-vX.0/prod-vX.0), jamais deduite automatiquement d'un numero de
// build : la creation d'un tag reste un acte explicite de l'utilisateur.
export const appVersion = (): string | null => process.env.APP_VERSION?.trim() || null;
