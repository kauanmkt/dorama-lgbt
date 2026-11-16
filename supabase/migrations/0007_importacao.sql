-- =====================================================================
--  Migração 0007 — importação do catálogo antigo (CineDrama → Dorama LGBT)
--
--  Cada linha de "imports" é um dorama a copiar. Um processo automático
--  (chamado a cada minuto pelo próprio banco) pega um dorama por vez,
--  copia a capa e os pedaços do vídeo (HLS) para o Cloudflare R2, cria o
--  dorama no catálogo e, no fim, publica.
-- =====================================================================

create table public.imports (
  id              uuid primary key default gen_random_uuid(),
  source          text not null default 'cinedrama',
  source_id       text not null,
  title           text not null,
  title_original  text not null,
  cover_url       text,
  source_url      text not null,
  categories      text[] not null default '{}',
  status          text not null default 'pendente'
                  check (status in ('pendente', 'copiando', 'pronto', 'erro', 'ignorado')),
  dorama_id       uuid references public.doramas (id) on delete set null,
  storage_prefix  text,
  segments_total  integer not null default 0,
  segments_done   integer not null default 0,
  duration_sec    integer,
  bytes_copied    bigint not null default 0,
  attempts        integer not null default 0,
  error           text,
  locked_until    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (source, source_id)
);

create trigger imports_updated_at before update on public.imports
  for each row execute function public.set_updated_at();

alter table public.imports enable row level security;
create policy "imports: admin lê" on public.imports for select to authenticated using (public.is_admin());
grant select on public.imports to authenticated;

-- Pega o próximo dorama a copiar, com "trava" de 75 s para dois processos
-- não copiarem o mesmo dorama ao mesmo tempo. Só o servidor (chave secreta) usa.
create or replace function public.claim_import()
returns setof public.imports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id
    from public.imports
   where status in ('pendente', 'copiando')
     and (locked_until is null or locked_until < now())
     and attempts < 8
   order by (status = 'copiando') desc, created_at
   limit 1
   for update skip locked;
  if v_id is null then
    return;
  end if;
  return query
    update public.imports
       set locked_until = now() + interval '75 seconds'
     where id = v_id
    returning *;
end;
$$;

revoke execute on function public.claim_import() from public, anon, authenticated;
grant execute on function public.claim_import() to service_role;

-- Categoria para os títulos dublados
insert into public.categories (slug, name, description, position)
values ('dublados', 'Dublados', 'Para assistir sem legenda, em português.', 9)
on conflict (slug) do nothing;
