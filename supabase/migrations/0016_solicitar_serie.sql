-- =====================================================================
--  Migração 0016 — "Solicitar série" (order bump)
--  Cada compra do produto dá 1 crédito. Cada pedido gasta 1 crédito.
--  Os pedidos chegam no painel (Admin → Pedidos de séries).
-- =====================================================================

-- Créditos: um por compra (chave do pedido evita crédito em dobro)
create table if not exists public.series_request_credits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  order_key   text unique,                 -- "pedido:produto" da Lowify (null = dado pelo admin)
  source      text not null default 'compra' check (source in ('compra', 'admin')),
  created_at  timestamptz not null default now(),
  used_at     timestamptz,
  request_id  uuid,
  revoked_at  timestamptz                  -- reembolso
);
create index if not exists series_request_credits_user_idx on public.series_request_credits (user_id) where used_at is null and revoked_at is null;

-- Pedidos
create table if not exists public.series_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  email       text not null default '',
  title       text not null check (char_length(title) between 2 and 200),
  details     text not null default '' check (char_length(details) <= 1000),
  status      text not null default 'pendente' check (status in ('pendente', 'adicionada', 'recusada')),
  admin_note  text not null default '' check (char_length(admin_note) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists series_requests_status_idx on public.series_requests (status, created_at desc);
create index if not exists series_requests_user_idx on public.series_requests (user_id, created_at desc);

alter table public.series_request_credits enable row level security;
alter table public.series_requests enable row level security;

-- Cliente vê só os próprios pedidos/créditos; admin vê e gerencia tudo. Ninguém insere direto (só pela função).
drop policy if exists "ver proprios creditos" on public.series_request_credits;
create policy "ver proprios creditos" on public.series_request_credits for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "admin gerencia creditos" on public.series_request_credits;
create policy "admin gerencia creditos" on public.series_request_credits for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "ver proprios pedidos" on public.series_requests;
create policy "ver proprios pedidos" on public.series_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "admin gerencia pedidos" on public.series_requests;
create policy "admin gerencia pedidos" on public.series_requests for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "admin apaga pedidos" on public.series_requests;
create policy "admin apaga pedidos" on public.series_requests for delete to authenticated
  using ((select public.is_admin()));

grant select on public.series_request_credits to authenticated;
grant insert, update, delete on public.series_request_credits to authenticated;
grant select, update, delete on public.series_requests to authenticated;

-- Quantos créditos a pessoa logada tem para usar (admin: ilimitado = -1)
create or replace function public.my_request_credits()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.admins a where a.user_id = auth.uid()) then -1
    else (select count(*)::int from public.series_request_credits c
           where c.user_id = auth.uid() and c.used_at is null and c.revoked_at is null)
  end;
$$;
revoke execute on function public.my_request_credits() from public, anon;
grant execute on function public.my_request_credits() to authenticated;

-- Envia um pedido gastando 1 crédito (admin não gasta)
create or replace function public.submit_series_request(p_title text, p_details text default '')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_title   text := btrim(coalesce(p_title, ''));
  v_details text := btrim(coalesce(p_details, ''));
  v_credit  uuid;
  v_id      uuid;
  v_admin   boolean;
begin
  if v_uid is null then raise exception 'nao_logado'; end if;
  if char_length(v_title) < 2 then raise exception 'titulo_curto'; end if;
  v_title := left(v_title, 200);
  v_details := left(v_details, 1000);
  v_admin := exists (select 1 from public.admins a where a.user_id = v_uid);

  if not v_admin then
    select c.id into v_credit from public.series_request_credits c
     where c.user_id = v_uid and c.used_at is null and c.revoked_at is null
     order by c.created_at
     limit 1
     for update skip locked;
    if v_credit is null then raise exception 'sem_credito'; end if;
  end if;

  insert into public.series_requests (user_id, email, title, details)
  values (v_uid, coalesce((select p.email from public.profiles p where p.id = v_uid), ''), v_title, v_details)
  returning id into v_id;

  if v_credit is not null then
    update public.series_request_credits set used_at = now(), request_id = v_id where id = v_credit;
  end if;
  return v_id;
end;
$$;
revoke execute on function public.submit_series_request(text, text) from public, anon;
grant execute on function public.submit_series_request(text, text) to authenticated;

-- Avisos de "sua série chegou" (notificação) — novo tipo
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('lancamento', 'continuar', 'saudade', 'aviso', 'suporte', 'teste', 'pedido'));

insert into public.settings (key, value, is_public) values
  ('request_product_ids', '["48125"]'::jsonb, false),
  ('request_checkout_url', '"https://checkout.lowify.com.br/go.php?offer=5c3f45b7"'::jsonb, true)
on conflict (key) do nothing;
