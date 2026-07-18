import { getPortalHealth } from "./db";

const BAD_RUNS_THRESHOLD = 3;

/**
 * Si algún portal falló (0 notas o error) en sus últimas 3 corridas,
 * termina con exit 1: el workflow de GitHub Actions queda rojo y
 * GitHub avisa por email. Es el sistema de alertas, gratis.
 */
export async function checkHealthOrExit(): Promise<void> {
  const health = await getPortalHealth();
  const unhealthy = health.filter((p) => p.bad_runs >= BAD_RUNS_THRESHOLD);

  if (unhealthy.length === 0) {
    console.log("Salud: todos los portales OK");
    return;
  }

  console.error("PORTALES CON PROBLEMAS (3 corridas malas seguidas):");
  for (const portal of unhealthy) {
    console.error(`  - ${portal.name} (${portal.slug}), última corrida: ${portal.last_run_at}`);
  }
  console.error("Revisar selectores en packages/core/src/portals/.");
  process.exit(1);
}
