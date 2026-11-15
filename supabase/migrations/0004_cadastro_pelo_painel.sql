-- =====================================================================
--  Migração 0004 — cadastro de conteúdo pelo painel (Etapa 6)
--
--  Funções usadas pelo painel para salvar tudo de uma vez, numa única
--  operação: ou salva tudo, ou nada (sem deixar dorama "pela metade").
--  Todas rodam com as permissões de quem chama (security invoker) e
--  recusam quem não for administrador.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Salvar dorama completo (dados + categorias + temporadas + episódios)
--
--  payload = {
--    id?, slug, title, original_title, tagline, synopsis, year, country,
--    age_rating, status, visibility, is_featured, is_new, art_seed,
--    poster_url, banner_url,
--    categories: ["bl", "romance"],
--    seasons: [{ number, episodes: [{ id?, number, title, synopsis, duration_min }] }]
--  }
--  Temporadas/episódios que não vierem no payload são excluídos.
--  Episódios existentes mantêm o id (e portanto o vídeo vinculado).
-- ---------------------------------------------------------------------
create or replace function public.admin_save_dorama(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id         uuid := nullif(payload ->> 'id', '')::uuid;
  v_featured   boolean := coalesce((payload ->> 'is_featured')::boolean, false);
  v_season     jsonb;
  v_episode    jsonb;
  v_season_id  uuid;
  v_ep_id      uuid;
  v_numbers    integer[];
  v_keep       uuid[];
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem salvar doramas' using errcode = '42501';
  end if;

  -- 1) Dados principais
  if v_id is null then
    insert into public.doramas (
      slug, title, original_title, tagline, synopsis, year, country, age_rating, status,
      visibility, is_featured, featured_position, is_new, art_seed, poster_url, banner_url
    ) values (
      payload ->> 'slug',
      payload ->> 'title',
      nullif(payload ->> 'original_title', ''),
      coalesce(payload ->> 'tagline', ''),
      coalesce(payload ->> 'synopsis', ''),
      nullif(payload ->> 'year', '')::integer,
      coalesce(payload ->> 'country', ''),
      coalesce(payload ->> 'age_rating', '14')::public.age_rating,
      coalesce(payload ->> 'status', 'em_exibicao')::public.dorama_status,
      coalesce(payload ->> 'visibility', 'rascunho')::public.visibility,
      v_featured,
      case when v_featured
        then (select coalesce(max(featured_position), 0) + 1 from public.doramas where is_featured)
        else 0 end,
      coalesce((payload ->> 'is_new')::boolean, true),
      coalesce((payload ->> 'art_seed')::integer, 0),
      nullif(payload ->> 'poster_url', ''),
      nullif(payload ->> 'banner_url', '')
    )
    returning id into v_id;
  else
    update public.doramas set
      slug           = payload ->> 'slug',
      title          = payload ->> 'title',
      original_title = nullif(payload ->> 'original_title', ''),
      tagline        = coalesce(payload ->> 'tagline', ''),
      synopsis       = coalesce(payload ->> 'synopsis', ''),
      year           = nullif(payload ->> 'year', '')::integer,
      country        = coalesce(payload ->> 'country', ''),
      age_rating     = coalesce(payload ->> 'age_rating', '14')::public.age_rating,
      status         = coalesce(payload ->> 'status', 'em_exibicao')::public.dorama_status,
      visibility     = coalesce(payload ->> 'visibility', 'rascunho')::public.visibility,
      -- ao entrar nos destaques, vai para o fim da fila
      featured_position = case
        when v_featured and not is_featured
          then (select coalesce(max(d.featured_position), 0) + 1 from public.doramas d where d.is_featured)
        else featured_position end,
      is_featured    = v_featured,
      is_new         = coalesce((payload ->> 'is_new')::boolean, true),
      poster_url     = nullif(payload ->> 'poster_url', ''),
      banner_url     = nullif(payload ->> 'banner_url', '')
    where id = v_id;
    if not found then
      raise exception 'Dorama não encontrado' using errcode = 'P0002';
    end if;
  end if;

  -- 2) Categorias
  delete from public.dorama_categories where dorama_id = v_id;
  insert into public.dorama_categories (dorama_id, category_id)
  select v_id, c.id
  from public.categories c
  where c.slug in (select jsonb_array_elements_text(coalesce(payload -> 'categories', '[]'::jsonb)));

  -- 3) Temporadas: remove as que saíram
  select coalesce(array_agg((s ->> 'number')::integer), '{}')
    into v_numbers
    from jsonb_array_elements(coalesce(payload -> 'seasons', '[]'::jsonb)) s;
  delete from public.seasons where dorama_id = v_id and not (number = any (v_numbers));

  for v_season in select * from jsonb_array_elements(coalesce(payload -> 'seasons', '[]'::jsonb)) loop
    select id into v_season_id
      from public.seasons
     where dorama_id = v_id and number = (v_season ->> 'number')::integer;
    if v_season_id is null then
      insert into public.seasons (dorama_id, number)
      values (v_id, (v_season ->> 'number')::integer)
      returning id into v_season_id;
    end if;

    -- 4) Episódios: remove os que saíram…
    select coalesce(array_agg((e ->> 'id')::uuid), '{}')
      into v_keep
      from jsonb_array_elements(coalesce(v_season -> 'episodes', '[]'::jsonb)) e
     where (e ->> 'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    delete from public.episodes where season_id = v_season_id and not (id = any (v_keep));

    -- …afasta os números dos que ficam (permite trocar a ordem sem conflito)…
    update public.episodes set number = number + 100000 where season_id = v_season_id;

    -- …e grava cada episódio com o número final.
    for v_episode in select * from jsonb_array_elements(coalesce(v_season -> 'episodes', '[]'::jsonb)) loop
      v_ep_id := null;
      if (v_episode ->> 'id') = any (v_keep::text[]) then
        update public.episodes set
          number       = (v_episode ->> 'number')::integer,
          title        = coalesce(v_episode ->> 'title', ''),
          synopsis     = coalesce(v_episode ->> 'synopsis', ''),
          duration_min = greatest(0, coalesce((v_episode ->> 'duration_min')::integer, 0))
        where id = (v_episode ->> 'id')::uuid and season_id = v_season_id
        returning id into v_ep_id;
      end if;
      if v_ep_id is null then
        insert into public.episodes (season_id, number, title, synopsis, duration_min)
        values (
          v_season_id,
          (v_episode ->> 'number')::integer,
          coalesce(v_episode ->> 'title', ''),
          coalesce(v_episode ->> 'synopsis', ''),
          greatest(0, coalesce((v_episode ->> 'duration_min')::integer, 0))
        );
      end if;
    end loop;
  end loop;

  return jsonb_build_object('id', v_id, 'slug', payload ->> 'slug');
end;
$$;

-- ---------------------------------------------------------------------
--  Ordem dos destaques do banner (lista de ids, na ordem desejada).
--  Quem não estiver na lista sai dos destaques.
-- ---------------------------------------------------------------------
create or replace function public.admin_set_featured(ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores' using errcode = '42501';
  end if;
  update public.doramas set is_featured = false, featured_position = 0
   where is_featured and not (id = any (ids));
  update public.doramas d set is_featured = true, featured_position = t.pos
    from unnest(ids) with ordinality as t(id, pos)
   where d.id = t.id;
end;
$$;

-- ---------------------------------------------------------------------
--  Ordem das categorias (lista de slugs, na ordem das fileiras da home)
-- ---------------------------------------------------------------------
create or replace function public.admin_reorder_categories(slugs text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores' using errcode = '42501';
  end if;
  update public.categories c set position = t.pos
    from unnest(slugs) with ordinality as t(slug, pos)
   where c.slug = t.slug;
end;
$$;

revoke execute on function public.admin_save_dorama(jsonb),
                           public.admin_set_featured(uuid[]),
                           public.admin_reorder_categories(text[])
  from public, anon;
grant execute on function public.admin_save_dorama(jsonb),
                          public.admin_set_featured(uuid[]),
                          public.admin_reorder_categories(text[])
  to authenticated;
