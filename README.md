# arnius

Noticias de agenda, multi-usuario. arnius scrapea las portadas de los principales portales de noticias argentinos y le muestra a cada usuario únicamente las noticias cuyos **títulos** matchean su propia lista de palabras clave.

**Demo**: [arnius-web.vercel.app](https://arnius-web.vercel.app) — entrá con tu cuenta de Google.

## Cómo funciona

```
                    ┌─────────────────────┐
  GitHub Actions    │      SCRAPER        │        Supabase (Postgres)
  cron cada 30' ──▶ │  fetch + cheerio    │ ───▶  articles (TODAS las notas,
  (2h de noche)     │  11 portales        │        sin filtrar, 3 días)
                    └─────────────────────┘               │
                                                          │  full-text search
                                                          │  español + unaccent
                    ┌─────────────────────┐               ▼
  Usuario ────────▶ │   WEB (Next.js)     │ ◀───  my_feed(): filtra por las
  (login Google)    │   feed + keywords   │        keywords DEL usuario al leer
                    └─────────────────────┘
```

La decisión central es el **modelo invertido**: el scraper no sabe nada de keywords — guarda _todo_ lo que aparece en las portadas. El filtrado ocurre al momento de leer, con una función SQL (`my_feed`) que cruza los artículos contra las palabras del usuario autenticado usando full-text search en español (índice GIN + `unaccent`): "dolar" matchea "Dólar", "jubilación" matchea "jubilaciones", y "reforma laboral" exige las dos palabras juntas. Un solo scraping sirve a todos los usuarios, tengan las palabras que tengan.

## Portales

Infobae · Clarín · La Nación · Perfil · Página 12 · Ámbito · El Cronista · La Política Online · Letra P · Cenital · La Derecha Diario

Cada portal es un archivo de configuración declarativa ([`packages/core/src/portals/`](packages/core/src/portals/)): selectores de portada, encoding y fallbacks de fecha. Agregar un portal = 1 archivo + 1 fila en la base.

## Estructura del monorepo

```
arnius/
├── apps/web/          # PWA Next.js (App Router) — Vercel
├── apps/scraper/      # Scraper Node + TS — corre por cron en GitHub Actions
├── packages/core/     # Lógica compartida y testeada: parsers, fechas, matching
│   └── test/fixtures/ # Portadas y notas REALES capturadas: los tests corren offline
└── supabase/          # Migraciones SQL versionadas (schema, RLS, funciones)
```

## Stack

| Capa         | Tecnología                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| Web          | Next.js (App Router, Server Components + Server Actions), TypeScript estricto, Tailwind                              |
| Datos + Auth | Supabase: Postgres con Row Level Security, Google Sign-In (Google Identity Services + `signInWithIdToken` con nonce) |
| Scraping     | `fetch` nativo + cheerio; detección de charset por página (hay portales que mezclan UTF-8 e ISO-8859-1)              |
| Matching     | Postgres FTS: configuración `spanish` + `unaccent`, tsvector generado **solo sobre títulos**, índice GIN             |
| Scheduling   | GitHub Actions: cron cada 30 min (diurno ART, 2 h de madrugada) + keepalive contra el auto-disable de 60 días        |
| PWA          | Serwist (manifest + service worker; nunca cachea datos ni auth)                                                      |
| Calidad      | Vitest (100+ tests contra fixtures reales), ESLint, Prettier, CI en cada push                                        |

## Confiabilidad

El scraping de HTML es frágil por naturaleza (los portales rediseñan sin avisar). arnius lo asume y se defiende:

- **Tests contra fixtures reales**: cada parser se prueba contra portadas y notas reales capturadas. Cuando un portal cambia, el flujo de reparación es: re-descargar fixture → ver el test fallar → ajustar selector.
- **Salud por corrida**: cada ejecución registra cuántas notas trajo cada portal (`scrape_runs`); la vista `portal_health` de la base lo resume.
- **Alertas gratis**: si un portal devuelve 0 notas en 3 corridas seguidas, el proceso termina con error → el workflow de GitHub queda rojo → email automático.
- **Anti-apagado**: GitHub deshabilita los crons de repos sin actividad por 60 días (así murió la v1 de este proyecto). El workflow incluye un paso de keepalive que lo re-habilita vía API en cada corrida.
- **Idempotencia**: re-correr el scraper no duplica nada (upsert por URL) y no re-visita notas ya conocidas ni descartadas.

## Seguridad

- **RLS en todas las tablas**: cada usuario solo ve/edita sus propias keywords; los artículos son de solo lectura para autenticados; nadie escribe vía API pública.
- La **service role key** (que saltea RLS) vive únicamente en el entorno del scraper (GitHub Actions secrets / `.env` local gitignoreado). Jamás en Vercel ni en el bundle.
- Login con **nonce** verificado entre Google y Supabase (anti replay).

## Desarrollo local

```bash
npm install

# Web (localhost:3000) — requiere apps/web/.env.local (ver .env.example)
npm run dev

# Scraper — requiere apps/scraper/.env (ver .env.example)
npm run scrape

# Calidad
npm run test        # vitest (fixtures incluidos, corre offline)
npm run lint        # eslint + prettier --check
npm run typecheck   # tsc en los 3 workspaces
npm run build       # build de producción de la web
```

Para recrear la base desde cero: proyecto en [supabase.com](https://supabase.com) + `npx supabase link` + `npx supabase db push` (aplica `supabase/migrations/`).

## Variables de entorno

| Variable                        | Dónde                     | Qué es                           |
| ------------------------------- | ------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | web (local + Vercel)      | URL del proyecto Supabase        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | web (local + Vercel)      | Key pública (RLS aplica)         |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`  | web (local + Vercel)      | OAuth client de Google (público) |
| `SUPABASE_URL`                  | scraper (local + Actions) | URL del proyecto Supabase        |
| `SUPABASE_SERVICE_ROLE_KEY`     | scraper (local + Actions) | **Secreta** — saltea RLS         |

---

Reescritura completa de un proyecto de 2023 que era single-tenant, con keywords hardcodeadas y filtrado en el origen del scraping.
