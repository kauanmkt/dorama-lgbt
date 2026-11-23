-- O player passou a avisar "estou assistindo" a cada 90 s (antes 30 s) para gastar
-- menos na Vercel. A limpeza de telas paradas acompanha: 4 min sem aviso.
do $$
declare src text;
begin
  select pg_get_functiondef('public.playback_ping(text, uuid, text)'::regprocedure) into src;
  src := replace(src, $q$interval '90 seconds'$q$, $q$interval '4 minutes'$q$);
  execute src;
end $$;
