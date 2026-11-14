-- =====================================================================
--  Migração 0002 — ajustes para o login só com e-mail
--  Supabase → SQL Editor → New query → colar → Run (depois da 0001).
-- =====================================================================

-- Link da página de compra (aparece no login para quem ainda não é assinante)
insert into public.settings (key, value, is_public)
values ('purchase_url', '""', true)
on conflict (key) do nothing;

-- E-mails sempre em minúsculas no perfil (o login compara assim)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    left(coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)), 80)
  );
  return new;
end;
$$;

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = lower(coalesce(new.email, '')) where id = new.id;
  return new;
end;
$$;

update public.profiles set email = lower(email) where email <> lower(email);
create unique index if not exists profiles_email_unique_idx on public.profiles (email);
