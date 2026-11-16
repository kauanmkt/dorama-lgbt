-- =====================================================================
--  Migração 0006 — integração com a Lowify (pagamentos)
--
--  Cada plano pode ser ligado a um ou mais produtos da Lowify (pelo ID
--  do produto). Quando chega uma venda daquele produto, o acesso é
--  liberado no plano correspondente.
-- =====================================================================
alter table public.plans
  add column if not exists external_product_ids text[] not null default '{}';

comment on column public.plans.external_product_ids is
  'IDs dos produtos na plataforma de pagamento (Lowify) que liberam este plano';

-- Busca rápida das vendas por cliente (histórico no painel)
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
