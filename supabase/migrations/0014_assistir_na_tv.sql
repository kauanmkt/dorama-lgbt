-- =====================================================================
--  Migração 0014 — "Assista na televisão" (order bump)
--  Quem compra o produto ganha o tutorial de como assistir na TV.
-- =====================================================================

alter table public.subscriptions add column if not exists tv_access boolean not null default false;

-- A pessoa logada pode ver o tutorial da TV? (admin sempre; cliente: comprou + plano ativo)
create or replace function public.my_tv_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid())
      or exists (
        select 1 from public.subscriptions s
         where s.user_id = auth.uid() and s.tv_access
           and public.has_active_access(auth.uid())
      );
$$;
revoke execute on function public.my_tv_access() from public, anon;
grant execute on function public.my_tv_access() to authenticated;

insert into public.settings (key, value, is_public) values
  ('tv_product_ids', '["68571"]'::jsonb, false),
  ('tv_upgrade_url', '""'::jsonb, true)
on conflict (key) do nothing;
