-- Los 11 portales scrapeados. Los slugs deben coincidir con
-- packages/core/src/portals/index.ts.
insert into public.portals (slug, name, base_url) values
  ('infobae', 'Infobae', 'https://www.infobae.com/'),
  ('clarin', 'Clarín', 'https://www.clarin.com/'),
  ('lanacion', 'La Nación', 'https://www.lanacion.com.ar/'),
  ('perfil', 'Perfil', 'https://www.perfil.com/'),
  ('pagina12', 'Página 12', 'https://www.pagina12.com.ar/'),
  ('ambito', 'Ámbito', 'https://www.ambito.com/'),
  ('cronista', 'El Cronista', 'https://www.cronista.com/'),
  ('lpo', 'La Política Online', 'https://www.lapoliticaonline.com/'),
  ('letrap', 'Letra P', 'https://www.letrap.com.ar/'),
  ('cenital', 'Cenital', 'https://cenital.com/'),
  ('derechadiario', 'La Derecha Diario', 'https://derechadiario.com.ar/');
