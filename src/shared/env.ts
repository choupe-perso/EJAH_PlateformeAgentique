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
