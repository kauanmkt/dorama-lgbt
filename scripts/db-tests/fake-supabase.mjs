// Simula a API REST do Supabase (só as consultas do catálogo) sobre o Postgres local,
// executando como visitante "anon" — ou seja, com o RLS valendo.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import http from "node:http";

const root = process.argv[2];
const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated, service_role;
`);
await db.exec(readFileSync(`${root}/supabase/migrations/0001_estrutura_inicial.sql`, "utf8"));
await db.exec(readFileSync(`${root}/supabase/seed-demo.sql`, "utf8"));
// Um rascunho (não deve aparecer) e um dorama novo publicado com 1 episódio sem vídeo
await db.exec(`
  insert into doramas (slug, title, visibility) values ('rascunho-secreto', 'NÃO DEVE APARECER', 'rascunho');
  insert into doramas (slug, title, tagline, synopsis, year, country, visibility, is_new, popularity, art_seed)
    values ('vindo-do-banco', 'Vindo do Banco', 'Prova de que o app lê o Supabase', 'Teste.', 2026, 'Japão', 'publicado', true, 200, 3);
  insert into dorama_categories select d.id, c.id from doramas d, categories c where d.slug='vindo-do-banco' and c.slug in ('bl','romance');
  insert into seasons (dorama_id, number) select id, 1 from doramas where slug='vindo-do-banco';
  insert into episodes (season_id, number, title, duration_min, video_ready)
    select s.id, n, 'Episódio ' || n, 45, n = 1 from seasons s join doramas d on d.id=s.dorama_id, generate_series(1,2) n where d.slug='vindo-do-banco';
`);

const DORAMAS_SQL = `
select coalesce(json_agg(json_build_object(
  'id', d.id, 'slug', d.slug, 'title', d.title, 'original_title', d.original_title, 'tagline', d.tagline,
  'synopsis', d.synopsis, 'year', d.year, 'country', d.country, 'age_rating', d.age_rating, 'status', d.status,
  'is_featured', d.is_featured, 'featured_position', d.featured_position, 'is_new', d.is_new,
  'popularity', d.popularity, 'art_seed', d.art_seed, 'poster_url', d.poster_url, 'banner_url', d.banner_url,
  'dorama_categories', (select coalesce(json_agg(json_build_object('categories',
      (select json_build_object('slug', c.slug) from categories c where c.id = dc.category_id))), '[]'::json)
    from dorama_categories dc where dc.dorama_id = d.id),
  'seasons', (select coalesce(json_agg(json_build_object('number', s.number, 'title', s.title, 'episodes',
      (select coalesce(json_agg(json_build_object('id', e.id, 'number', e.number, 'title', e.title, 'synopsis', e.synopsis,
        'duration_min', e.duration_min, 'thumbnail_url', e.thumbnail_url, 'video_ready', e.video_ready)), '[]'::json)
       from episodes e where e.season_id = s.id))), '[]'::json)
    from seasons s where s.dorama_id = d.id)
)), '[]'::json) as j
from doramas d where d.visibility = 'publicado'`;

let hits = 0;
http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    let sql;
    if (url.pathname === "/rest/v1/doramas" && url.searchParams.get("visibility") === "eq.publicado") sql = DORAMAS_SQL;
    else if (url.pathname === "/rest/v1/categories")
      sql = `select coalesce(json_agg(json_build_object('slug', slug, 'name', name, 'description', description) order by position), '[]'::json) j from categories`;
    if (!sql) {
      console.log("404", req.method, url.pathname + url.search);
      res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ message: "not found" }));
      return;
    }
    hits++;
    await db.exec("set role anon");
    const { rows } = await db.query(sql);
    await db.exec("reset role");
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(rows[0].j));
  })
  .listen(54321, () => console.log("fake supabase on :54321"));
setInterval(() => process.stdout.write(""), 1 << 30);
process.on("SIGTERM", () => { console.log("requests:", hits); process.exit(0); });
