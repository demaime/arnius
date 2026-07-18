-- El revoke de 0004 quitaba el permiso a "anon" pero el grant por defecto a
-- PUBLIC lo seguía habilitando. Se revoca de PUBLIC y se concede solo a
-- usuarios autenticados (y al service role para diagnósticos).
revoke execute on function public.my_feed from public;
revoke execute on function public.my_feed from anon;
grant execute on function public.my_feed to authenticated;
grant execute on function public.my_feed to service_role;
