-- =====================================================================
--  Migração 0010 — chat de suporte (cliente ↔ painel)
--
--  Cada cliente tem UMA conversa. O cliente vê e escreve só na própria;
--  o administrador vê e responde todas. As mensagens só entram pelas
--  funções abaixo (assim ninguém se passa pelo suporte).
-- =====================================================================

create table public.support_threads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.profiles (id) on delete cascade,
  status          text not null default 'aberto' check (status in ('aberto', 'resolvido')),
  last_message_at timestamptz not null default now(),
  last_preview    text not null default '',
  unread_admin    integer not null default 0,
  unread_client   integer not null default 0,
  created_at      timestamptz not null default now()
);

create table public.support_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.support_threads (id) on delete cascade,
  sender     text not null check (sender in ('cliente', 'suporte')),
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index support_messages_thread_idx on public.support_messages (thread_id, created_at);
create index support_threads_order_idx on public.support_threads (last_message_at desc);

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

create policy "suporte: ver a própria conversa ou admin" on public.support_threads
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "suporte: ver as próprias mensagens ou admin" on public.support_messages
  for select to authenticated using (
    public.is_admin() or exists (select 1 from public.support_threads t where t.id = thread_id and t.user_id = auth.uid())
  );
grant select on public.support_threads, public.support_messages to authenticated;

-- Cliente manda mensagem (cria a conversa na primeira vez)
create or replace function public.support_send(p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_thread uuid;
  v_body   text := btrim(coalesce(p_body, ''));
begin
  if v_uid is null then raise exception 'Entre na sua conta' using errcode = '42501'; end if;
  if char_length(v_body) = 0 or char_length(v_body) > 2000 then raise exception 'Mensagem vazia ou longa demais'; end if;

  insert into public.support_threads (user_id) values (v_uid)
  on conflict (user_id) do nothing;
  select id into v_thread from public.support_threads where user_id = v_uid;

  -- trava simples contra spam: no máximo 20 mensagens em 10 minutos
  if (select count(*) from public.support_messages
       where thread_id = v_thread and sender = 'cliente' and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'Muitas mensagens seguidas. Aguarde um pouco.';
  end if;

  insert into public.support_messages (thread_id, sender, body) values (v_thread, 'cliente', v_body);
  update public.support_threads
     set last_message_at = now(), last_preview = left(v_body, 140), status = 'aberto',
         unread_admin = unread_admin + 1, unread_client = 0
   where id = v_thread;
  return v_thread;
end;
$$;

-- Suporte (admin) responde
create or replace function public.support_reply(p_thread uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
begin
  if not public.is_admin() then raise exception 'Apenas administradores' using errcode = '42501'; end if;
  if char_length(v_body) = 0 or char_length(v_body) > 2000 then raise exception 'Mensagem vazia ou longa demais'; end if;
  insert into public.support_messages (thread_id, sender, body) values (p_thread, 'suporte', v_body);
  update public.support_threads
     set last_message_at = now(), last_preview = left(v_body, 140), unread_client = unread_client + 1, unread_admin = 0
   where id = p_thread;
end;
$$;

-- Marcar como lida (o cliente a própria; o admin qualquer uma)
create or replace function public.support_mark_read(p_thread uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_thread is null then
    update public.support_threads set unread_client = 0 where user_id = auth.uid();
  elsif public.is_admin() then
    update public.support_threads set unread_admin = 0 where id = p_thread;
  end if;
end;
$$;

-- Admin marca a conversa como resolvida / reabre
create or replace function public.support_set_status(p_thread uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Apenas administradores' using errcode = '42501'; end if;
  update public.support_threads set status = p_status where id = p_thread and p_status in ('aberto', 'resolvido');
end;
$$;

revoke execute on function public.support_send(text), public.support_reply(uuid, text),
  public.support_mark_read(uuid), public.support_set_status(uuid, text) from public, anon;
grant execute on function public.support_send(text), public.support_reply(uuid, text),
  public.support_mark_read(uuid), public.support_set_status(uuid, text) to authenticated;

-- Produtos da Lowify que valem "+1 tela" (order bump)
insert into public.settings (key, value, is_public)
values ('extra_screen_product_ids', '[]'::jsonb, false)
on conflict (key) do nothing;
