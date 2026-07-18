-- URLs ya visitadas y descartadas por viejas (notas fijadas en portada con
-- fecha fuera de la ventana de retención). Evita re-visitarlas en cada
-- corrida. Solo la usa el scraper (service role): sin acceso vía API.
create table public.skipped_urls (
  url        text primary key,
  skipped_at timestamptz not null default now()
);

alter table public.skipped_urls enable row level security;
-- Sin políticas: nadie accede vía API pública; el service role saltea RLS.
