-- =====================================================================
--  Migração 0009 — limite de telas assistindo ao mesmo tempo
--
--  O player chama playback_ping a cada 30 s. Uma tela conta como "em uso"
--  enquanto manda sinal (até 90 s sem sinal = livre). Se o plano permite
--  N telas (+ telas extras) e já há N em uso, a nova tela é recusada.
--  Administradores não têm limite.
-- =====================================================================

create or replace function public.playback_ping(p_device text, p_episode uuid default null, p_agent text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_screens integer;
  v_active  integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'login');
  end if;
  if coalesce(length(p_device), 0) not between 8 and 80 then
    return jsonb_build_object('ok', false, 'reason', 'device');
  end if;

  -- um sinal de cada vez por pessoa (evita duas telas "furarem" a fila juntas)
  perform pg_advisory_xact_lock(hashtext(v_uid::text));

  delete from public.playback_sessions
   where user_id = v_uid and last_heartbeat_at < now() - interval '90 seconds';

  -- esta tela já está em uso: só renova
  update public.playback_sessions
     set last_heartbeat_at = now(), episode_id = p_episode
   where user_id = v_uid and device_id = p_device;
  if found then
    return jsonb_build_object('ok', true);
  end if;

  if public.is_admin() then
    v_screens := 1000;
  else
    if not public.has_active_access(v_uid) then
      return jsonb_build_object('ok', false, 'reason', 'sem_acesso');
    end if;
    select coalesce(p.screens, 1) + coalesce(s.extra_screens, 0)
      into v_screens
      from public.subscriptions s
      left join public.plans p on p.id = s.plan_id
     where s.user_id = v_uid;
    v_screens := greatest(coalesce(v_screens, 1), 1);
  end if;

  select count(*) into v_active from public.playback_sessions where user_id = v_uid;
  if v_active >= v_screens then
    return jsonb_build_object('ok', false, 'reason', 'limite', 'screens', v_screens, 'active', v_active);
  end if;

  insert into public.playback_sessions (user_id, device_id, episode_id, user_agent)
  values (v_uid, p_device, p_episode, left(p_agent, 300));
  return jsonb_build_object('ok', true);
end;
$$;

-- Libera a tela na hora (ao fechar o player)
create or replace function public.playback_stop(p_device text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.playback_sessions where user_id = auth.uid() and device_id = p_device;
$$;

revoke execute on function public.playback_ping(text, uuid, text), public.playback_stop(text) from public, anon;
grant execute on function public.playback_ping(text, uuid, text), public.playback_stop(text) to authenticated;
