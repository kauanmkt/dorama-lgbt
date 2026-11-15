-- =====================================================================
--  Migração 0003 — funções de conta só para quem está logado
--  (apontado pelo relatório de segurança do Supabase)
-- =====================================================================

-- O Postgres libera funções novas para "public" por padrão; aqui tiramos isso.
revoke execute on function public.has_active_access(uuid) from public, anon;
revoke execute on function public.my_access() from public, anon;
grant execute on function public.has_active_access(uuid) to authenticated, service_role;
grant execute on function public.my_access() to authenticated, service_role;

-- is_admin() continua disponível para visitantes de propósito: as regras de
-- segurança do catálogo a usam (para visitantes ela sempre responde "não").
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;
