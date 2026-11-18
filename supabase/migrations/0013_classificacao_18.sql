-- =====================================================================
--  Migração 0013 — classificação indicativa 18+ para todo o catálogo
-- =====================================================================

-- Todos os doramas passam a ser 18+
update public.doramas set age_rating = '18' where age_rating <> '18';

-- Doramas novos (painel e importação automática) já nascem 18+
alter table public.doramas alter column age_rating set default '18';

-- O cadastro pelo painel usava 14 quando a classificação não vinha preenchida
do $$
declare src text;
begin
  select pg_get_functiondef('public.admin_save_dorama(jsonb)'::regprocedure) into src;
  src := replace(src, $q$coalesce(payload ->> 'age_rating', '14')$q$, $q$coalesce(payload ->> 'age_rating', '18')$q$);
  execute src;
end $$;
