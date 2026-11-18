-- =====================================================================
--  Migração 0012 — notificações (no celular e no sino do site)
--
--  push_subscriptions  aparelhos que aceitaram receber notificação
--  notification_prefs  o que cada pessoa quer receber (tudo ligado por padrão)
--  notifications       caixa de entrada (sino) — também evita repetir envio
--  app_secrets         chaves do servidor (só o servidor lê)
-- =====================================================================

create table if not exists public.app_secrets (
  key        text primary key,
  value      jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;  -- sem regras: só o servidor

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh      text not null check (char_length(p256dh) <= 200),
  auth        text not null check (char_length(auth) <= 100),
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_ok_at  timestamptz
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
grant select, delete on public.push_subscriptions to authenticated;
create policy "push: ver os próprios" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "push: apagar os próprios" on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

create table if not exists public.notification_prefs (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  lancamentos boolean not null default true,
  continuar   boolean not null default true,
  saudade     boolean not null default true,
  avisos      boolean not null default true,
  suporte     boolean not null default true,
  updated_at  timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
grant select, insert, update on public.notification_prefs to authenticated;
create policy "prefs: ver as próprias" on public.notification_prefs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "prefs: criar as próprias" on public.notification_prefs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "prefs: mudar as próprias" on public.notification_prefs
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('lancamento', 'continuar', 'saudade', 'aviso', 'suporte', 'teste')),
  ref        text,
  title      text not null check (char_length(title) <= 120),
  body       text not null default '' check (char_length(body) <= 300),
  url        text not null default '/',
  image      text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_kind_idx on public.notifications (kind, created_at desc);
-- a mesma notificação (tipo + referência) nunca chega duas vezes para a mesma pessoa
-- (índice completo: ref vazio nunca conflita, e o "upsert" do app consegue usar)
create unique index if not exists notifications_once_idx on public.notifications (user_id, kind, ref);
alter table public.notifications enable row level security;
grant select on public.notifications to authenticated;
create policy "notificações: ver as próprias" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

-- Doramas já publicados não geram aviso de lançamento
alter table public.doramas add column if not exists release_notified_at timestamptz;
update public.doramas set release_notified_at = now() where visibility = 'publicado' and release_notified_at is null;

-- ---------------------------------------------------------------------
--  Funções usadas pelo app (pessoa logada)
-- ---------------------------------------------------------------------

-- Guarda (ou move para esta conta) o aparelho que aceitou notificações
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_agent text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_uid, p_endpoint, p_p256dh, p_auth, left(p_agent, 300))
  on conflict (endpoint) do update
    set user_id = v_uid, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, created_at = now();
  return true;
end;
$$;

-- Marca como lidas (todas, ou só as indicadas)
create or replace function public.notifications_mark_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  update public.notifications set read_at = now()
   where user_id = auth.uid() and read_at is null
     and (p_ids is null or id = any (p_ids));
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Última atividade (para a notificação de "saudade"): renova a cada 10 min de uso
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
  update public.profiles set last_seen_at = now()
   where id = v_uid and (last_seen_at is null or last_seen_at < now() - interval '10 minutes');
  update public.login_sessions set last_seen_at = now() where session_id = v_sid and user_id = v_uid;
  if not found then
    return public.session_login(p_agent);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
--  Funções da rotina automática (só o servidor)
-- ---------------------------------------------------------------------

-- Quem tem acesso ativo hoje
create or replace function public.notify_active_users()
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
    from public.profiles p
   where exists (select 1 from public.admins a where a.user_id = p.id)
      or exists (
        select 1 from public.subscriptions s
         where s.user_id = p.id and s.status = 'ativa' and s.plan_id is not null
           and (s.lifetime or s.expires_at > now())
      );
$$;

-- "Continue de onde parou": parou no meio há 20 h–3 dias, com o app instalado
create or replace function public.notify_continue_candidates()
returns table (user_id uuid, dorama_id uuid, episode_id uuid, slug text, title text, poster_url text, pct integer, ref text)
language sql
stable
security definer
set search_path = ''
as $$
  with last_watch as (
    select distinct on (w.user_id)
           w.user_id, w.episode_id, w.position_sec, w.duration_sec, w.completed, w.updated_at, d.id as dorama_id,
           d.slug, d.title, d.poster_url
      from public.watch_progress w
      join public.episodes e on e.id = w.episode_id
      join public.seasons s on s.id = e.season_id
      join public.doramas d on d.id = s.dorama_id and d.visibility = 'publicado'
     order by w.user_id, w.updated_at desc
  )
  select l.user_id, l.dorama_id, l.episode_id, l.slug, l.title, l.poster_url,
         round(100.0 * l.position_sec / l.duration_sec)::integer,
         l.dorama_id::text || ':' || to_char(l.updated_at, 'YYYY-MM-DD')
    from last_watch l
   where not l.completed
     and l.duration_sec > 0
     and l.position_sec::numeric / l.duration_sec between 0.05 and 0.90
     and l.updated_at between now() - interval '3 days' and now() - interval '20 hours'
     and l.user_id in (select a.user_id from public.notify_active_users() a)
     and exists (select 1 from public.push_subscriptions ps where ps.user_id = l.user_id)
     and coalesce((select np.continuar from public.notification_prefs np where np.user_id = l.user_id), true)
     and not exists (
       select 1 from public.notifications n
        where n.user_id = l.user_id and n.kind in ('continuar', 'saudade')
          and n.created_at > now() - interval '20 hours'
     );
$$;

-- "Saudade": sumiu há 5+ dias, com o app instalado, no máximo 1 por semana
create or replace function public.notify_comeback_candidates()
returns table (user_id uuid, name text, days integer, new_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name,
         extract(day from now() - coalesce(p.last_seen_at, p.created_at))::integer,
         (select count(*)::integer from public.doramas d
           where d.visibility = 'publicado' and d.published_at > coalesce(p.last_seen_at, p.created_at))
    from public.profiles p
   where coalesce(p.last_seen_at, p.created_at) < now() - interval '5 days'
     and p.id in (select a.user_id from public.notify_active_users() a)
     and exists (select 1 from public.push_subscriptions ps where ps.user_id = p.id)
     and coalesce((select np.saudade from public.notification_prefs np where np.user_id = p.id), true)
     and not exists (
       select 1 from public.notifications n
        where n.user_id = p.id
          and ((n.kind = 'saudade' and n.created_at > now() - interval '7 days')
            or (n.kind = 'continuar' and n.created_at > now() - interval '20 hours'))
     );
$$;

-- Destinatários de um tipo de notificação (acesso ativo + preferência ligada)
create or replace function public.notify_recipients(p_kind text)
returns table (user_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select a.user_id
    from public.notify_active_users() a
    left join public.notification_prefs np on np.user_id = a.user_id
   where case p_kind
           when 'lancamento' then coalesce(np.lancamentos, true)
           when 'aviso' then coalesce(np.avisos, true)
           when 'suporte' then coalesce(np.suporte, true)
           when 'continuar' then coalesce(np.continuar, true)
           when 'saudade' then coalesce(np.saudade, true)
           else true
         end;
$$;

revoke execute on function
  public.notify_active_users(),
  public.notify_continue_candidates(),
  public.notify_comeback_candidates(),
  public.notify_recipients(text)
from public, anon, authenticated;
grant execute on function
  public.notify_active_users(),
  public.notify_continue_candidates(),
  public.notify_comeback_candidates(),
  public.notify_recipients(text)
to service_role;

revoke execute on function public.push_subscribe(text, text, text, text), public.notifications_mark_read(uuid[]) from public, anon;
grant execute on function public.push_subscribe(text, text, text, text), public.notifications_mark_read(uuid[]) to authenticated;
