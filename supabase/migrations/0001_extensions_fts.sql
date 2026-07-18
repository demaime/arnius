-- Extensión para búsqueda sin tildes + configuración full-text en español.

create extension if not exists unaccent with schema extensions;

-- Configuración de búsqueda: español (stemming) + unaccent (ignora tildes).
create text search configuration public.es_unaccent (copy = spanish);

alter text search configuration public.es_unaccent
  alter mapping for hword, hword_part, word
  with extensions.unaccent, spanish_stem;

-- unaccent() es STABLE; este wrapper IMMUTABLE permite usarla en índices.
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent', $1)
$$;
