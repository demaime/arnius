# arnius — contexto para Claude

App multi-usuario de noticias argentinas: scrapea portadas de 11 portales y cada usuario ve solo las noticias cuyos TÍTULOS matchean su lista de palabras clave. El README explica la arquitectura completa — leelo primero.

## Reglas de trabajo con Demian (importante)

- **NUNCA hacer commits, push ni operaciones de git.** Demian maneja git él mismo, siempre. Avisarle qué quedó listo para commitear. Sin trailers "Co-Authored-By".
- **NUNCA correr `npm run dev` ni matar procesos node** — Demian tiene su dev server corriendo siempre. Para verificar: build/typecheck/tests, o pedirle que mire el navegador.
- **Consultarle toda decisión** (herramientas, arquitectura, alcance) con opciones y recomendación antes de avanzar. Paso a paso, en español.
- Estética: base neutra blanco/negro/grises. La identidad visual definitiva la hace Demian aparte (los íconos en `apps/web/public/icons/` son placeholders).

## Mapa rápido

- `packages/core/` — parsers de portales (configs declarativas en `src/portals/`), fechas es-AR, matching/highlight, decode de charset. Tests contra fixtures HTML reales en `test/fixtures/` (portadas + notas capturadas; los tests corren offline).
- `apps/scraper/` — orquestador: portadas → diff contra DB → enriquecer solo lo nuevo → upsert. Idempotente. `skipped_urls` recuerda notas viejas para no re-visitarlas. Health: portal con 3 corridas malas ⇒ exit 1 ⇒ workflow rojo ⇒ email.
- `apps/web/` — Next.js App Router. Auth: botón nativo Google (GIS + `signInWithIdToken` con nonce). Keywords en MODAL (no hay ruta /keywords). Feed usa `rpc('my_feed')`. OJO: en Next 16 el middleware se llama `proxy.ts`. Build con `--webpack` (Serwist no soporta Turbopack).
- `supabase/migrations/` — schema completo: FTS español+unaccent SOLO sobre títulos, RLS en todo, trigger de signup (perfil + 5 keywords semilla), retención 3 días (la aplica el scraper).
- `.github/workflows/` — `ci.yml` (calidad en cada push) y `scrape.yml` (cron 8×/día ART + keepalive propio vía `gh api` contra el auto-disable de 60 días de GitHub).

## Gotchas aprendidos

- Portales cambian encoding: LPO sirve portada ISO-8859-1 y notas UTF-8 ⇒ `decodeHtml()` sniffea el charset por página.
- Derecha Diario devuelve shell vacío sin headers `Accept` + `Accept-Language` de navegador (están en `fetchPage.ts`).
- El filtro `.in("url", [...])` de PostgREST rompe con muchas URLs largas ⇒ se traen todas las URLs paginadas y se diffea en memoria.
- En Vercel: variables `NEXT_PUBLIC_*` sin marcar "Sensitive" (bloquea el build) y siempre redeploy tras cambiarlas.
- ESLint queda en v9 (`eslint-config-next` no soporta v10). Las fixtures pueden disparar el secret-scanner de GitHub con keys públicas de terceros: falso positivo, se scrubea del HTML.

## Env vars

Ver `.env.example` de cada app. La `SUPABASE_SERVICE_ROLE_KEY` solo existe en `apps/scraper/.env` (local) y en los secrets de GitHub Actions — jamás en Vercel ni en el cliente.
