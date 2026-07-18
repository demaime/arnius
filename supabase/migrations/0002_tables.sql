-- Tablas principales de arnius.

-- Catálogo de portales scrapeados (seed en 0005).
create table public.portals (
  id       smallint generated always as identity primary key,
  slug     text not null unique,
  name     text not null,
  base_url text not null,
  enabled  boolean not null default true
);

-- TODAS las noticias de portada, sin filtrar por keywords (modelo invertido:
-- un solo scraping sirve a todos los usuarios; el filtrado es por lectura).
-- La búsqueda es ÚNICAMENTE sobre el título; summary es solo vista previa.
create table public.articles (
  id            bigint generated always as identity primary key,
  portal_id     smallint not null references public.portals (id),
  url           text not null unique,
  title         text not null,
  summary       text,
  published_at  timestamptz,
  first_seen_at timestamptz not null default now(),
  search        tsvector generated always as (
    to_tsvector('public.es_unaccent', coalesce(title, ''))
  ) stored
);

create index articles_search_idx on public.articles using gin (search);
create index articles_recency_idx on public.articles ((coalesce(published_at, first_seen_at)) desc);
create index articles_portal_idx on public.articles (portal_id);

-- Perfil 1:1 con auth.users (lo crea el trigger de 0004).
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- Lista de palabras clave de cada usuario.
create table public.user_keywords (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  keyword    text not null check (char_length(trim(keyword)) between 2 and 80),
  created_at timestamptz not null default now()
);

-- Unicidad por usuario ignorando mayúsculas y tildes ("Dólar" ≡ "dolar").
create unique index user_keywords_uniq
  on public.user_keywords (user_id, public.f_unaccent(lower(trim(keyword))));

create index user_keywords_user_idx on public.user_keywords (user_id);

-- Registro de cada corrida del scraper (salud/monitoreo).
create table public.scrape_runs (
  id           bigint generated always as identity primary key,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  status       text not null default 'running'
               check (status in ('running', 'ok', 'partial', 'failed')),
  articles_new int not null default 0
);

create index scrape_runs_started_idx on public.scrape_runs (started_at desc);

-- Detalle por portal de cada corrida.
create table public.scrape_run_portals (
  run_id         bigint not null references public.scrape_runs (id) on delete cascade,
  portal_id      smallint not null references public.portals (id),
  articles_found int not null default 0,
  articles_new   int not null default 0,
  error          text,
  duration_ms    int,
  primary key (run_id, portal_id)
);
