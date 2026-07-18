# arnius

Noticias de agenda, multi-usuario. Scrapea las portadas de los principales portales argentinos y cada usuario ve solo las noticias cuyos **títulos** matchean su propia lista de palabras clave.

> 🚧 En desarrollo. README completo al final del proyecto.

## Estructura

- `apps/web` — PWA Next.js (App Router) desplegada en Vercel
- `apps/scraper` — scraper Node que corre por cron en GitHub Actions
- `packages/core` — tipos y lógica compartida (configs de portales, fechas, matching)
- `supabase/` — migraciones de la base (Postgres + Auth)

## Desarrollo

```bash
npm install
npm run dev        # app web en localhost:3000
npm run scrape     # corrida local del scraper (requiere .env en apps/scraper)
npm run lint
npm run typecheck
npm run test
```
