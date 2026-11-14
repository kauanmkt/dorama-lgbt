-- =====================================================================
--  DORAMA LGBT — ESTRUTURA DO BANCO DE DADOS (Supabase / PostgreSQL)
--  Migração 0001: tabelas, relações, regras de segurança (RLS) e funções.
--
--  Como aplicar: Supabase → SQL Editor → New query → colar tudo → Run.
--  Pode ser executado uma única vez num projeto novo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TIPOS (listas fixas de valores)
-- ---------------------------------------------------------------------
create type public.dorama_status       as enum ('em_exibicao', 'completo');
create type public.visibility          as enum ('rascunho', 'publicado');
create type public.age_rating          as enum ('L', '10', '12', '14', '16', '18');
create type public.plan_type           as enum ('recorrente', 'vitalicio');
create type public.subscription_status as enum ('ativa', 'suspensa', 'cancelada');
create type public.video_status        as enum ('enviando', 'processando', 'pronto', 'erro');
create type public.video_format        as enum ('mp4', 'hls');
create type public.payment_status      as enum ('pendente', 'aprovado', 'recusado', 'reembolsado', 'cancelado');

-- ---------------------------------------------------------------------
-- 2. FUNÇÃO AUXILIAR: atualiza "updated_at" sozinho
-- ---------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. USUÁRIOS E ADMINISTRADORES
-- ---------------------------------------------------------------------

-- Perfil público de cada conta (criado automaticamente no cadastro)
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  name         text not null default '' check (char_length(name) <= 80),
  email        text not null,
  avatar_url   text,
  last_seen_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index profiles_email_idx on public.profiles (lower(email));
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Quem é administrador. Só pode ser alterado direto no banco (nunca pelo app).
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- "Essa pessoa é admin?" — usada pelas regras de segurança.
-- security definer: consegue ler a tabela admins mesmo sem permissão direta.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

-- Cria o perfil automaticamente quando alguém se cadastra
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)), 80)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém o e-mail do perfil igual ao da conta
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------
-- 4. CATÁLOGO
-- ---------------------------------------------------------------------

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 1 and 60),
  description text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index categories_position_idx on public.categories (position);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.doramas (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique
                    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and slug <> 'novo'),
  title             text not null check (char_length(title) between 1 and 120),
  original_title    text,
  tagline           text not null default '' check (char_length(tagline) <= 90),
  synopsis          text not null default '',
  year              integer check (year between 1950 and 2100),
  country           text not null default '',
  age_rating        public.age_rating not null default '14',
  status            public.dorama_status not null default 'em_exibicao',
  visibility        public.visibility not null default 'rascunho',
  is_featured       boolean not null default false,
  featured_position integer not null default 0,
  is_new            boolean not null default true,
  popularity        integer not null default 0,
  art_seed          integer not null default 0,
  poster_url        text,
  banner_url        text,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index doramas_visibility_idx on public.doramas (visibility);
create index doramas_featured_idx   on public.doramas (featured_position) where is_featured;
create index doramas_popularity_idx on public.doramas (popularity desc);
create trigger doramas_updated_at before update on public.doramas
  for each row execute function public.set_updated_at();

-- Registra a data da primeira publicação
create function public.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.visibility = 'publicado' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;
create trigger doramas_published_at before insert or update of visibility on public.doramas
  for each row execute function public.set_published_at();

-- Ligação dorama ↔ categoria (um dorama pode ter várias categorias)
create table public.dorama_categories (
  dorama_id   uuid not null references public.doramas (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (dorama_id, category_id)
);
create index dorama_categories_category_idx on public.dorama_categories (category_id);

create table public.seasons (
  id         uuid primary key default gen_random_uuid(),
  dorama_id  uuid not null references public.doramas (id) on delete cascade,
  number     integer not null check (number > 0),
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dorama_id, number)
);
create trigger seasons_updated_at before update on public.seasons
  for each row execute function public.set_updated_at();

create table public.episodes (
  id            uuid primary key default gen_random_uuid(),
  season_id     uuid not null references public.seasons (id) on delete cascade,
  number        integer not null check (number > 0),
  title         text not null default '',
  synopsis      text not null default '',
  duration_min  integer not null default 0 check (duration_min >= 0),
  thumbnail_url text,
  -- true quando há um vídeo pronto para assistir (atualizado automaticamente)
  video_ready   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (season_id, number)
);
create trigger episodes_updated_at before update on public.episodes
  for each row execute function public.set_updated_at();

-- Arquivo de vídeo de cada episódio no Cloudflare R2.
-- Só administradores enxergam esta tabela: o caminho do arquivo nunca vai
-- para o navegador do cliente. O link para assistir é gerado pelo servidor.
create table public.videos (
  id           uuid primary key default gen_random_uuid(),
  episode_id   uuid not null unique references public.episodes (id) on delete cascade,
  storage_key  text not null unique,
  file_name    text not null default '',
  size_bytes   bigint not null default 0 check (size_bytes >= 0),
  duration_sec integer,
  format       public.video_format not null default 'mp4',
  status       public.video_status not null default 'enviando',
  uploaded_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger videos_updated_at before update on public.videos
  for each row execute function public.set_updated_at();

-- Mantém episodes.video_ready sempre correto
create function public.sync_episode_video_ready()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.episodes set video_ready = false where id = old.episode_id;
    return old;
  end if;
  update public.episodes set video_ready = (new.status = 'pronto') where id = new.episode_id;
  if tg_op = 'UPDATE' and old.episode_id <> new.episode_id then
    update public.episodes set video_ready = false where id = old.episode_id;
  end if;
  return new;
end;
$$;
create trigger videos_sync_ready
  after insert or update or delete on public.videos
  for each row execute function public.sync_episode_video_ready();

-- ---------------------------------------------------------------------
-- 5. PLANOS, ASSINATURAS E PAGAMENTOS
-- ---------------------------------------------------------------------

create table public.plans (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 60),
  description   text not null default '',
  price_cents   integer not null check (price_cents >= 0),
  type          public.plan_type not null default 'recorrente',
  duration_days integer check (duration_days > 0),
  screens       integer not null default 1 check (screens between 1 and 20),
  active        boolean not null default true,
  highlight     boolean not null default false,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- plano com prazo precisa de duração; vitalício não tem
  check ((type = 'recorrente' and duration_days is not null)
      or (type = 'vitalicio' and duration_days is null))
);
create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- Acesso atual de cada cliente (uma linha por pessoa)
create table public.subscriptions (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  plan_id       uuid references public.plans (id) on delete set null,
  status        public.subscription_status not null default 'ativa',
  lifetime      boolean not null default false,
  starts_at     timestamptz not null default now(),
  expires_at    timestamptz,
  extra_screens integer not null default 0 check (extra_screens between 0 and 20),
  source        text not null default 'manual' check (source in ('manual', 'gateway')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- ou é vitalício, ou tem data de expiração
  check (lifetime or expires_at is not null)
);
create index subscriptions_expires_idx on public.subscriptions (expires_at);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Histórico de pagamentos (preenchido pelos webhooks do gateway, no servidor)
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles (id) on delete set null,
  plan_id      uuid references public.plans (id) on delete set null,
  provider     text not null,
  external_id  text not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency     text not null default 'BRL',
  status       public.payment_status not null default 'pendente',
  paid_at      timestamptz,
  raw          jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (provider, external_id)
);
create index payments_user_idx on public.payments (user_id);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- "Essa pessoa pode assistir agora?"
-- Cada um só pode perguntar sobre si mesmo (admin pode perguntar sobre qualquer um).
create function public.has_active_access(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (uid = (select auth.uid()) or public.is_admin())
    and (
      exists (select 1 from public.admins a where a.user_id = uid)
      or exists (
        select 1 from public.subscriptions s
        where s.user_id = uid
          and s.status = 'ativa'
          and s.plan_id is not null
          and (s.lifetime or s.expires_at > now())
      )
    );
$$;

-- Resumo do acesso da pessoa logada (usado na tela de Perfil)
create function public.my_access()
returns table (
  has_access    boolean,
  plan_name     text,
  plan_type     public.plan_type,
  screens       integer,
  lifetime      boolean,
  expires_at    timestamptz,
  status        public.subscription_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.has_active_access(auth.uid()),
    p.name,
    p.type,
    coalesce(p.screens, 0) + coalesce(s.extra_screens, 0),
    coalesce(s.lifetime, false),
    s.expires_at,
    s.status
  from (select auth.uid() as uid) me
  left join public.subscriptions s on s.user_id = me.uid
  left join public.plans p on p.id = s.plan_id
  where me.uid is not null;
$$;

-- ---------------------------------------------------------------------
-- 6. DADOS DE USO DO CLIENTE
-- ---------------------------------------------------------------------

-- Minha Lista
create table public.favorites (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  dorama_id  uuid not null references public.doramas (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, dorama_id)
);

-- Progresso de cada episódio (Continuar Assistindo)
create table public.watch_progress (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  episode_id   uuid not null references public.episodes (id) on delete cascade,
  position_sec integer not null default 0 check (position_sec >= 0),
  duration_sec integer not null default 0 check (duration_sec >= 0),
  completed    boolean not null default false,
  updated_at   timestamptz not null default now(),
  primary key (user_id, episode_id)
);
create index watch_progress_recent_idx on public.watch_progress (user_id, updated_at desc);
create trigger watch_progress_updated_at before update on public.watch_progress
  for each row execute function public.set_updated_at();

-- Telas assistindo agora (controle de telas simultâneas — Etapa 9)
create table public.playback_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  device_id         text not null,
  episode_id        uuid references public.episodes (id) on delete set null,
  user_agent        text,
  started_at        timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  unique (user_id, device_id)
);
create index playback_sessions_heartbeat_idx on public.playback_sessions (user_id, last_heartbeat_at desc);

-- ---------------------------------------------------------------------
-- 7. CONFIGURAÇÕES DA PLATAFORMA
-- ---------------------------------------------------------------------
create table public.settings (
  key        text primary key,
  value      jsonb not null,
  is_public  boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 8. SEGURANÇA (RLS): quem pode ver e alterar cada tabela
--    Regra de ouro: o app nunca decide sozinho. O banco confere tudo.
-- =====================================================================

alter table public.profiles          enable row level security;
alter table public.admins            enable row level security;
alter table public.categories        enable row level security;
alter table public.doramas           enable row level security;
alter table public.dorama_categories enable row level security;
alter table public.seasons           enable row level security;
alter table public.episodes          enable row level security;
alter table public.videos            enable row level security;
alter table public.plans             enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.payments          enable row level security;
alter table public.favorites         enable row level security;
alter table public.watch_progress    enable row level security;
alter table public.playback_sessions enable row level security;
alter table public.settings          enable row level security;

-- Perfis: cada um vê o seu; admin vê todos
create policy "perfil: ver o próprio ou admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "perfil: editar o próprio" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Admins: a pessoa só consegue ver se ela mesma é admin
create policy "admins: ver o próprio registro" on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Categorias: todos veem; só admin altera
create policy "categorias: todos veem" on public.categories
  for select to anon, authenticated using (true);
create policy "categorias: admin altera" on public.categories
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Doramas: todos veem os publicados; admin vê e altera tudo (inclusive rascunhos)
create policy "doramas: ver publicados ou admin" on public.doramas
  for select to anon, authenticated
  using (visibility = 'publicado' or (select public.is_admin()));
create policy "doramas: admin altera" on public.doramas
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Ligações, temporadas e episódios seguem a visibilidade do dorama
create policy "dorama_categorias: ver se o dorama é visível" on public.dorama_categories
  for select to anon, authenticated
  using (exists (
    select 1 from public.doramas d
    where d.id = dorama_id and (d.visibility = 'publicado' or (select public.is_admin()))
  ));
create policy "dorama_categorias: admin altera" on public.dorama_categories
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "temporadas: ver se o dorama é visível" on public.seasons
  for select to anon, authenticated
  using (exists (
    select 1 from public.doramas d
    where d.id = dorama_id and (d.visibility = 'publicado' or (select public.is_admin()))
  ));
create policy "temporadas: admin altera" on public.seasons
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "episódios: ver se o dorama é visível" on public.episodes
  for select to anon, authenticated
  using (exists (
    select 1 from public.seasons s
    join public.doramas d on d.id = s.dorama_id
    where s.id = season_id and (d.visibility = 'publicado' or (select public.is_admin()))
  ));
create policy "episódios: admin altera" on public.episodes
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Vídeos: só admin (clientes recebem um link temporário gerado pelo servidor)
create policy "vídeos: só admin" on public.videos
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Planos: todos veem os ativos; admin vê e altera todos
create policy "planos: ver ativos ou admin" on public.plans
  for select to anon, authenticated
  using (active or (select public.is_admin()));
create policy "planos: admin altera" on public.plans
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Assinaturas: cliente vê a sua; só admin (ou o servidor) altera
create policy "assinaturas: ver a própria ou admin" on public.subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "assinaturas: admin altera" on public.subscriptions
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Pagamentos: cliente vê os seus; ninguém altera pelo app (só o servidor/webhook)
create policy "pagamentos: ver os próprios ou admin" on public.payments
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Minha Lista e progresso: cada um mexe só nos seus
create policy "favoritos: dono" on public.favorites
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "progresso: dono" on public.watch_progress
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Telas ativas: cliente vê e encerra as suas; admin vê e encerra todas.
-- Criar/atualizar é feito pelo servidor (Etapa 9).
create policy "telas: ver as próprias ou admin" on public.playback_sessions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "telas: encerrar as próprias ou admin" on public.playback_sessions
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Configurações: públicas para todos; privadas só admin
create policy "config: ver públicas ou admin" on public.settings
  for select to anon, authenticated
  using (is_public or (select public.is_admin()));
create policy "config: admin altera" on public.settings
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- =====================================================================
-- 9. PERMISSÕES DE ACESSO ÀS TABELAS (complementam o RLS)
-- =====================================================================
revoke all on all tables in schema public from anon, authenticated;

-- Visitantes (sem login): só leitura do catálogo, planos e configurações
grant select on public.categories, public.doramas, public.dorama_categories,
                public.seasons, public.episodes, public.plans, public.settings
  to anon;

-- Usuários logados: o RLS decide o que cada um pode fazer de fato
grant select, insert, update, delete on
  public.categories, public.doramas, public.dorama_categories, public.seasons,
  public.episodes, public.videos, public.plans, public.subscriptions,
  public.favorites, public.watch_progress, public.settings
  to authenticated;
grant select on public.profiles, public.admins, public.payments to authenticated;
grant select, delete on public.playback_sessions to authenticated;
-- No próprio perfil, o cliente só pode mudar nome e foto
grant update (name, avatar_url) on public.profiles to authenticated;

-- Funções
revoke execute on function public.handle_new_user(), public.handle_user_email_change(),
  public.sync_episode_video_ready() from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.has_active_access(uuid) to authenticated;
grant execute on function public.my_access() to authenticated;
revoke execute on function public.has_active_access(uuid) from anon;
revoke execute on function public.my_access() from anon;

-- ---------------------------------------------------------------------
-- 10. CONFIGURAÇÕES INICIAIS
-- ---------------------------------------------------------------------
insert into public.settings (key, value, is_public) values
  ('platform_name',   '"Dorama LGBT"', true),
  ('support_email',   '"suporte@doramalgbt.com"', true),
  ('announcement',    '""', true),
  ('signup_open',     'true', true),
  ('maintenance',     'false', true),
  ('autoplay_next',   'true', true),
  ('hero_rotation_s', '8', true);
