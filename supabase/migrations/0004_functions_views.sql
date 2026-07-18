-- Funciones y vistas: feed por usuario, salud por portal y alta de usuario.

-- Feed del usuario autenticado: matching full-text SOLO sobre títulos,
-- con las keywords del propio usuario. Una sola query, usa el índice GIN.
-- Keywords simples ("milei") y frases ("reforma laboral") vía comillas.
create or replace function public.my_feed(days int default 3, max_rows int default 200)
returns table (
  id bigint,
  url text,
  title text,
  summary text,
  published_at timestamptz,
  first_seen_at timestamptz,
  portal_slug text,
  portal_name text
)
language sql
stable
set search_path = public
as $$
  with q as (
    select websearch_to_tsquery(
             'public.es_unaccent',
             string_agg('"' || replace(k.keyword, '"', '') || '"', ' OR ')
           ) as tsq
    from public.user_keywords k
    where k.user_id = (select auth.uid())
  )
  select a.id, a.url, a.title, a.summary, a.published_at, a.first_seen_at,
         p.slug, p.name
  from public.articles a
  join public.portals p on p.id = a.portal_id
  cross join q
  where q.tsq is not null
    and a.search @@ q.tsq
    and coalesce(a.published_at, a.first_seen_at) > now() - make_interval(days => days)
  order by coalesce(a.published_at, a.first_seen_at) desc
  limit max_rows;
$$;

revoke execute on function public.my_feed from anon;

-- Salud por portal: de las últimas 3 corridas terminadas, cuántas fueron
-- "malas" (0 notas o error). bad_runs = 3 dispara la alerta del scraper.
create view public.portal_health
with (security_invoker = true) as
select
  p.id,
  p.slug,
  p.name,
  count(*) filter (where last3.articles_found = 0 or last3.error is not null) as bad_runs,
  max(last3.finished_at) as last_run_at
from public.portals p
left join lateral (
  select srp.articles_found, srp.error, sr.finished_at
  from public.scrape_run_portals srp
  join public.scrape_runs sr on sr.id = srp.run_id
  where srp.portal_id = p.id
    and sr.status <> 'running'
  order by sr.started_at desc
  limit 3
) last3 on true
where p.enabled
group by p.id, p.slug, p.name;

-- Alta de usuario: crea el perfil y siembra 5 keywords iniciales para que
-- el feed no arranque vacío (el usuario puede borrarlas).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );

  insert into public.user_keywords (user_id, keyword)
  values
    (new.id, 'milei'),
    (new.id, 'dólar'),
    (new.id, 'inflación'),
    (new.id, 'elecciones'),
    (new.id, 'congreso');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
