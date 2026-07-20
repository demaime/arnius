-- Preferencia de tema por usuario (claro/oscuro/sistema).
-- El update del propio perfil ya está cubierto por la policy "profiles: editar propio" (0003).
alter table public.profiles
  add column theme text not null default 'system'
  constraint profiles_theme_check check (theme in ('light', 'dark', 'system'));
