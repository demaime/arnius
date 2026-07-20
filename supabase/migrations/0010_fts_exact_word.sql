-- El matching del feed usaba stemming español: "pele" traía "peleas"/"pelearon"
-- porque comparten raíz, pero el highlight del front siempre fue por palabra
-- exacta, así que llegaban notas sin resaltar. Se saca el stemming: matching
-- por palabra completa, insensible a tildes y mayúsculas, igual que el highlight.
-- (Los plurales los restituye la 0011 vía variantes explícitas por keyword.)

-- Tokens con caracteres no-ASCII: unaccent (saca tildes) + simple (minúsculas).
alter text search configuration public.es_unaccent
  alter mapping for hword, hword_part, word
  with extensions.unaccent, simple;

-- Tokens ASCII puros (venían con spanish_stem del copy = spanish): no llevan
-- unaccent porque no tienen tildes.
alter text search configuration public.es_unaccent
  alter mapping for asciiword, asciihword, hword_asciipart
  with simple;

-- La columna generada tiene guardados los tsvector viejos (con stems); se
-- recrea para que se regenere con la config nueva. El índice GIN cae junto
-- con la columna.
alter table public.articles drop column search;

alter table public.articles add column search tsvector
  generated always as (
    to_tsvector('public.es_unaccent', coalesce(title, ''))
  ) stored;

create index articles_search_idx on public.articles using gin (search);
