-- =====================================================================
--  Migração 0011 — telas = aparelhos LOGADOS (não players tocando)
--
--  Cada login gera uma sessão (auth.sessions). Guardamos aqui de qual
--  aparelho ela veio. Ao entrar num aparelho novo, se a conta já tem o
--  número de logins que o plano permite (telas do plano + telas extras),
--  o login MAIS ANTIGO é derrubado na hora. Administradores: sem limite.
-- =====================================================================

create table if not exists public.login_sessions (
  session_id   uuid primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists login_sessions_user_idx on public.login_sessions (user_id, created_at desc);

alter table public.login_sessions enable row level security;
grant select on public.login_sessions to authenticated;
drop policy if exists "ver meus logins" on public.login_sessions;
create policy "ver meus logins" on public.login_sessions
  for select to authenticated using (user_id = (select auth.uid()));

-- Sessão (login) do token atual
create or replace function public.current_session_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'session_id', '')::uuid;
$$;

-- Quantos logins simultâneos a pessoa pode ter
create or replace function public.allowed_screens(p_uid uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v integer;
begin
  if exists (select 1 from public.admins where user_id = p_uid) then
    return 1000;
  end if;
  select coalesce(p.screens, 1) + coalesce(s.extra_screens, 0)
    into v
    from public.subscriptions s
    left join public.plans p on p.id = s.plan_id
   where s.user_id = p_uid;
  return greatest(coalesce(v, 1), 1);
end;
$$;

-- Registra o login atual e derruba os mais antigos que passarem do limite.
create or replace function public.session_login(p_agent text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_sid     uuid := public.current_session_id();
  v_screens integer;
  v_kicked  integer;
begin
  if v_uid is null or v_sid is null then
    return jsonb_build_object('ok', false, 'reason', 'login');
  end if;
  perform pg_advisory_xact_lock(hashtext('login:' || v_uid::text));

  if not exists (select 1 from auth.sessions where id = v_sid and user_id = v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'desconectado');
  end if;

  insert into public.login_sessions (session_id, user_id, user_agent)
  values (v_sid, v_uid, left(p_agent, 300))
  on conflict (session_id) do update
    set last_seen_at = now(),
        user_agent = coalesce(excluded.user_agent, public.login_sessions.user_agent);

  -- limpa registros de logins que já saíram/expiraram
  delete from public.login_sessions l
   where l.user_id = v_uid
     and not exists (select 1 from auth.sessions s where s.id = l.session_id);

  v_screens := public.allowed_screens(v_uid);

  with keep as (
    select session_id from public.login_sessions
     where user_id = v_uid
     order by (session_id = v_sid) desc, created_at desc
     limit v_screens
  ), kicked as (
    delete from public.login_sessions
     where user_id = v_uid and session_id not in (select session_id from keep)
    returning session_id
  ), gone as (
    delete from auth.sessions where id in (select session_id from kicked) returning 1
  )
  select count(*) into v_kicked from kicked;

  return jsonb_build_object('ok', true, 'screens', v_screens, 'kicked', v_kicked);
end;
$$;

-- Conferência periódica: este login ainda vale?
-- Logins antigos (de antes desta regra) são registrados na primeira conferência.
create or replace function public.session_touch(p_agent text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_sid uuid := public.current_session_id();
begin
  if v_uid is null or v_sid is null then
    return jsonb_build_object('ok', false, 'reason', 'login');
  end if;
  if not exists (select 1 from auth.sessions where id = v_sid and user_id = v_uid) then
    delete from public.login_sessions where session_id = v_sid;
    return jsonb_build_object('ok', false, 'reason', 'desconectado');
  end if;
  update public.login_sessions set last_seen_at = now() where session_id = v_sid and user_id = v_uid;
  if not found then
    return public.session_login(p_agent);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Versão só-leitura (para a playlist de vídeo)
create or replace function public.session_alive()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions
     where id = public.current_session_id() and user_id = auth.uid()
  );
$$;

-- Desconectar um aparelho pela página "Telas conectadas"
create or replace function public.session_revoke(p_session uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or p_session = public.current_session_id() then
    return false;
  end if;
  delete from public.login_sessions where session_id = p_session and user_id = v_uid;
  delete from auth.sessions where id = p_session and user_id = v_uid;
  return true;
end;
$$;

-- Painel: derrubar todos os logins de um cliente
create or replace function public.admin_revoke_sessions(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  if not public.is_admin() then
    raise exception 'sem permissão';
  end if;
  delete from public.login_sessions where user_id = p_user;
  delete from public.playback_sessions where user_id = p_user;
  delete from auth.sessions where user_id = p_user;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- O player continua mandando sinal (para "assistindo agora" no painel),
-- mas não bloqueia mais nada: só avisa se este login foi derrubado.
create or replace function public.playback_ping(p_device text, p_episode uuid default null, p_agent text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'login');
  end if;
  if not public.session_alive() then
    return jsonb_build_object('ok', false, 'reason', 'desconectado');
  end if;
  if coalesce(length(p_device), 0) not between 8 and 80 then
    return jsonb_build_object('ok', true);
  end if;
  delete from public.playback_sessions
   where user_id = v_uid and last_heartbeat_at < now() - interval '90 seconds';
  update public.playback_sessions
     set last_heartbeat_at = now(), episode_id = p_episode
   where user_id = v_uid and device_id = p_device;
  if not found then
    insert into public.playback_sessions (user_id, device_id, episode_id, user_agent)
    values (v_uid, p_device, p_episode, left(p_agent, 300));
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function
  public.allowed_screens(uuid),
  public.session_login(text),
  public.session_touch(text),
  public.session_alive(),
  public.session_revoke(uuid),
  public.admin_revoke_sessions(uuid)
from public, anon;
grant execute on function
  public.session_login(text),
  public.session_touch(text),
  public.session_alive(),
  public.session_revoke(uuid),
  public.admin_revoke_sessions(uuid)
to authenticated;
