-- =====================================================================
--  Migração 0017 — Catálogo aberto + janela de planos
--  Cada plano ganha o link do checkout e a opção "mostrar no site".
--  A janela de planos (visitante tocou num dorama) lista os planos
--  ativos, marcados para o site e com link preenchido.
-- =====================================================================

alter table public.plans add column if not exists checkout_url text not null default '';
alter table public.plans add column if not exists show_on_site boolean not null default false;

alter table public.plans drop constraint if exists plans_checkout_url_check;
alter table public.plans add constraint plans_checkout_url_check
  check (checkout_url = '' or checkout_url ~ '^https://');

-- Trimestral e Anual (desligados até ganharem preço, link e produto da Lowify)
insert into public.plans (name, description, price_cents, type, duration_days, screens, active, highlight, position, show_on_site)
select 'Trimestral', 'Acesso a todo o catálogo por 3 meses', 0, 'recorrente', 90, 1, false, false, 3, true
where not exists (select 1 from public.plans where name = 'Trimestral');

insert into public.plans (name, description, price_cents, type, duration_days, screens, active, highlight, position, show_on_site)
select 'Anual', 'Acesso a todo o catálogo por 1 ano', 0, 'recorrente', 365, 1, false, false, 4, true
where not exists (select 1 from public.plans where name = 'Anual');

update public.plans set show_on_site = true where name = 'Mensal';
