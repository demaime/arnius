-- Firma de la nota (nombre del autor o "Redacción"), extraída al enriquecer.
-- Nullable: notas sin firma, sin enriquecer o anteriores a esta migración.
alter table public.articles add column author text;

-- Agregar la columna al RETURNS TABLE cambia el tipo de retorno de my_feed,
-- y eso no se puede con "create or replace": hay que dropear y recrear.
drop function public.my_feed(int, int);

create function public.my_feed(days int default 3, max_rows int default 200)
returns table (
  id bigint,
  url text,
  title text,
  summary text,
  author text,
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
  select a.id, a.url, a.title, a.summary, a.author, a.published_at, a.first_seen_at,
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

-- El drop descartó los privilegios y la función nueva vuelve con EXECUTE
-- para PUBLIC (default de Postgres): re-aplicar el hardening de 0006.
revoke execute on function public.my_feed from public;
revoke execute on function public.my_feed from anon;
grant execute on function public.my_feed to authenticated;
grant execute on function public.my_feed to service_role;
