-- =====================================================================
--  TORNAR UMA CONTA ADMINISTRADORA
--  1. Crie sua conta normalmente pelo app (tela "Criar conta").
--  2. Troque o e-mail abaixo pelo seu.
--  3. Supabase → SQL Editor → cole → Run.
-- =====================================================================
insert into public.admins (user_id)
select id from auth.users where lower(email) = lower('SEU-EMAIL-AQUI@exemplo.com')
on conflict do nothing;

-- Confere: deve aparecer o seu e-mail
select u.email, a.created_at as admin_desde
from public.admins a join auth.users u on u.id = a.user_id;
