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
