import { join } from "node:path";

// En local las variables viven en apps/scraper/.env (gitignoreado);
// en GitHub Actions llegan como secrets ya presentes en process.env.
try {
  process.loadEnvFile(join(import.meta.dirname, "..", ".env"));
} catch {
  // sin .env: se asume que las variables ya están en el entorno
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Falta la variable de entorno ${name}`);
    process.exit(1);
  }
  return value;
}

export const SUPABASE_URL = required("SUPABASE_URL");
export const SUPABASE_SERVICE_ROLE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");
