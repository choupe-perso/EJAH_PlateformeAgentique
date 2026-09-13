export type AppEnvironment = "dev" | "test" | "prod";

function readAppEnvironment(): AppEnvironment {
  const value = process.env.APP_ENV;
  if (value === "dev" || value === "test" || value === "prod") {
    return value;
  }
  throw new Error(
    "APP_ENV manquant ou invalide. Attendu 'dev' | 'test' | 'prod' (voir config/.env.*.example)."
  );
}

export const appEnvironment = (): AppEnvironment => readAppEnvironment();
