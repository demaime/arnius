-- Row Level Security: los usuarios logueados leen el contenido común
-- (portales, artículos, salud del scraper) y solo ven/gestionan SUS keywords
-- y SU perfil. Nadie escribe artículos vía API pública: el scraper usa la
-- service role key, que saltea RLS. Sin acceso para anónimos.

alter table public.portals enable row level security;
alter table public.articles enable row level security;
alter table public.profiles enable row level security;
alter table public.user_keywords enable row level security;
alter table public.scrape_runs enable row level security;
alter table public.scrape_run_portals enable row level security;

-- Lectura común para usuarios autenticados.
create policy "portals: lectura autenticados"
  on public.portals for select to authenticated
  using (true);

create policy "articles: lectura autenticados"
  on public.articles for select to authenticated
  using (true);

create policy "scrape_runs: lectura autenticados"
  on public.scrape_runs for select to authenticated
  using (true);

create policy "scrape_run_portals: lectura autenticados"
  on public.scrape_run_portals for select to authenticated
  using (true);

-- Perfil: solo el dueño.
create policy "profiles: ver propio"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: editar propio"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Keywords: solo el dueño (ver, agregar, borrar).
create policy "user_keywords: ver propias"
  on public.user_keywords for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_keywords: agregar propias"
  on public.user_keywords for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_keywords: borrar propias"
  on public.user_keywords for delete to authenticated
  using ((select auth.uid()) = user_id);
