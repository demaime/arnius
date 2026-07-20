-- Matching: palabra exacta + variantes de plural/singular (reglas del español).
-- Completa la 0010 (que sacó el stemming): "dólar" vuelve a traer "dólares"
-- sin que "pele" traiga "peleas". La lógica canónica vive en packages/core
-- (keywordVariants): la web calcula las variantes al guardar cada keyword y
-- my_feed solo hace OR de lo guardado — cero morfología en SQL de acá en más.

-- 1) Variantes precalculadas de cada keyword.
alter table public.user_keywords
  add column variants text[] not null default '{}';

-- 2) Backfill único de las keywords existentes: espejo SQL de las reglas de
--    core (frases y palabras cortas quedan exactas; las próximas altas ya
--    vienen calculadas por la web).
update public.user_keywords set variants =
  case
    when keyword like '% %' or char_length(keyword) < 3
      then array[keyword]
    when keyword like '%z'
      then array[keyword, left(keyword, -1) || 'ces']
    when keyword like '%ces'
      then array[keyword, left(keyword, -3) || 'z', left(keyword, -2), left(keyword, -1), keyword || 'es']
    when keyword like '%es'
      then array[keyword, left(keyword, -2), left(keyword, -1), keyword || 'es']
    when keyword like '%s'
      then array[keyword, left(keyword, -1), keyword || 'es']
    when keyword ~ '[íú]$'
      then array[keyword, keyword || 's', keyword || 'es']
    when keyword ~ '[aeiouáéó]$'
      then array[keyword, keyword || 's']
    else array[keyword, keyword || 'es', keyword || 's']
  end;

-- Los singulares generados demasiado cortos son ruido ("veces" no debe dar "ve").
update public.user_keywords k
set variants = (
  select coalesce(array_agg(v), array[k.keyword])
  from unnest(k.variants) as v
  where v = k.keyword or char_length(v) >= 3
);

-- 3) my_feed: OR de las variantes guardadas, con fallback a la keyword exacta
--    si el array quedara vacío. Mismo tipo de retorno que 0009 ⇒ create or
--    replace conserva los grants (no repetir el hardening de 0006).
create or replace function public.my_feed(days int default 3, max_rows int default 200)
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
             string_agg('"' || replace(v.variant, '"', '') || '"', ' OR ')
           ) as tsq
    from public.user_keywords k
    cross join lateral unnest(
      case when cardinality(k.variants) > 0 then k.variants else array[k.keyword] end
    ) as v(variant)
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

-- 4) Seeds del signup con sus variantes (espejo hardcodeado de core).
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

  insert into public.user_keywords (user_id, keyword, variants)
  values
    (new.id, 'milei',      array['milei', 'mileis']),
    (new.id, 'dólar',      array['dólar', 'dólares', 'dólars']),
    (new.id, 'inflación',  array['inflación', 'inflaciónes', 'inflacións']),
    (new.id, 'elecciones', array['elecciones', 'eleccion', 'eleccione', 'eleccioneses']),
    (new.id, 'congreso',   array['congreso', 'congresos']);

  return new;
end;
$$;

-- 5) Guardia de palabras vacías al agregar keywords: si el diccionario español
--    de Postgres deja el tsquery vacío ("de", "la", "y"), la web rechaza la
--    keyword. Sin lista propia que mantener.
create or replace function public.is_stopword(kw text)
returns boolean
language sql
stable
set search_path = public
as $$
  select websearch_to_tsquery('spanish', coalesce(kw, '')) = ''::tsquery
$$;

revoke execute on function public.is_stopword from public;
revoke execute on function public.is_stopword from anon;
grant execute on function public.is_stopword to authenticated;
grant execute on function public.is_stopword to service_role;
