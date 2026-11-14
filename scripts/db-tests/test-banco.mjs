// Testa a migração do Dorama LGBT num Postgres local (PGlite), simulando o Supabase.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const root = process.argv[2];
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log("  ✓", msg); } else { fail++; console.log("  ✗", msg); } };
const q = async (sql, params) => (await db.query(sql, params)).rows;
const expectError = async (sql, msg, params) => {
  try { await db.query(sql, params); ok(false, msg + " (deveria falhar)"); }
  catch (e) { ok(true, msg + " → bloqueado: " + e.message.split("\n")[0].slice(0, 70)); }
};

// ---- Simulação mínima do Supabase ----
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated, service_role;
`);

const as = async (role, uid) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false); set role ${role};`);
};
const asOwner = () => db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);

console.log("\n▶ Aplicando migração");
await db.exec(readFileSync(`${root}/supabase/migrations/0001_estrutura_inicial.sql`, "utf8"));
ok(true, "migração aplicada sem erros");

console.log("\n▶ Aplicando dados de demonstração (2x, para testar repetição)");
await db.exec(readFileSync(`${root}/supabase/seed-demo.sql`, "utf8"));
await db.exec(readFileSync(`${root}/supabase/seed-demo.sql`, "utf8"));
const [{ n: nd }] = await q("select count(*)::int n from doramas");
const [{ n: ne }] = await q("select count(*)::int n from episodes");
const [{ n: np }] = await q("select count(*)::int n from plans");
ok(nd === 14 && np === 4, `14 doramas e 4 planos, sem duplicar (doramas=${nd}, planos=${np}, episódios=${ne})`);

// Rascunho criado pelo dono do banco
await q(`insert into doramas (slug, title, visibility) values ('rascunho-secreto', 'Rascunho', 'rascunho')`);
const [{ id: draftId }] = await q(`select id from doramas where slug='rascunho-secreto'`);
await q(`insert into seasons (dorama_id, number) values ($1, 1)`, [draftId]);

console.log("\n▶ Visitante (sem login)");
await as("anon");
ok((await q("select count(*)::int n from doramas"))[0].n === 14, "vê só os 14 publicados (rascunho escondido)");
ok((await q("select count(*)::int n from seasons where dorama_id=$1", [draftId]))[0].n === 0, "não vê temporadas de rascunho");
ok((await q("select count(*)::int n from categories"))[0].n === 8, "vê as categorias");
await expectError("select * from videos", "não acessa vídeos");
await expectError("select * from profiles", "não acessa perfis");
await expectError("insert into doramas (slug, title) values ('x','x')", "não cria dorama");
ok((await q("select public.is_admin() a"))[0].a === false, "is_admin() = falso");

console.log("\n▶ Cadastro de usuários");
await asOwner();
const [{ id: ana }] = await q(`insert into auth.users (email, raw_user_meta_data) values ('ana@email.com', '{"name":"Ana"}') returning id`);
const [{ id: beto }] = await q(`insert into auth.users (email) values ('beto@email.com') returning id`);
const [{ id: adm }] = await q(`insert into auth.users (email) values ('admin@email.com') returning id`);
const profs = await q("select name, email from profiles order by email");
ok(profs.length === 3 && profs.find((p) => p.email === "ana@email.com")?.name === "Ana", "perfil criado sozinho (com nome)");
ok(profs.find((p) => p.email === "beto@email.com")?.name === "beto", "sem nome → usa o início do e-mail");
await q(`update auth.users set email='ana.nova@email.com' where id=$1`, [ana]);
ok((await q("select email from profiles where id=$1", [ana]))[0].email === "ana.nova@email.com", "troca de e-mail sincroniza o perfil");

console.log("\n▶ Usuária comum (Ana)");
await as("authenticated", ana);
ok((await q("select count(*)::int n from profiles"))[0].n === 1, "vê só o próprio perfil");
await q("update profiles set name='Ana Clara' where id=$1", [ana]);
ok((await q("select name from profiles where id=$1", [ana]))[0].name === "Ana Clara", "edita o próprio nome");
await expectError("update profiles set email='hack@x.com' where id=$1", "não muda o e-mail pelo perfil", [ana]);
const r = await q("update profiles set name='hack' where id=$1 returning id", [beto]);
ok(r.length === 0, "não edita o perfil de outra pessoa");
await expectError("insert into admins (user_id) values ($1)", "não se torna admin sozinha", [ana]);
await expectError("insert into doramas (slug, title) values ('y','y')", "não cria dorama");
await expectError("insert into subscriptions (user_id, lifetime) values ($1, true)", "não libera acesso para si mesma", [ana]);
ok((await q("select count(*)::int n from videos"))[0].n === 0, "não vê nenhum vídeo");
ok((await q("select count(*)::int n from doramas"))[0].n === 14, "vê só publicados");
const [{ id: d1 }] = await q("select id from doramas where slug='amor-em-seul'");
await q("insert into favorites (user_id, dorama_id) values ($1, $2)", [ana, d1]);
ok((await q("select count(*)::int n from favorites"))[0].n === 1, "salva na Minha Lista");
await expectError("insert into favorites (user_id, dorama_id) values ($1, $2)", "não mexe na lista de outra pessoa", [beto, d1]);
const [{ id: ep1 }] = await q("select e.id from episodes e join seasons s on s.id=e.season_id where s.dorama_id=$1 and e.number=1", [d1]);
await q("insert into watch_progress (user_id, episode_id, position_sec, duration_sec) values ($1,$2,120,2700)", [ana, ep1]);
ok(true, "salva progresso de reprodução");
ok((await q("select public.has_active_access() a"))[0].a === false, "sem plano → sem acesso");
ok((await q("select public.has_active_access($1) a", [adm]))[0].a === false, "não consegue consultar o acesso de outra pessoa");
ok((await q("select count(*)::int n from public.my_access()"))[0].n === 1, "my_access() responde");

console.log("\n▶ Beto não vê os dados da Ana");
await as("authenticated", beto);
ok((await q("select count(*)::int n from favorites"))[0].n === 0, "não vê a Minha Lista da Ana");
ok((await q("select count(*)::int n from watch_progress"))[0].n === 0, "não vê o progresso da Ana");

console.log("\n▶ Administrador");
await asOwner();
await q("insert into admins (user_id) values ($1)", [adm]);
await as("authenticated", adm);
ok((await q("select public.is_admin() a"))[0].a === true, "is_admin() = verdadeiro");
ok((await q("select count(*)::int n from doramas"))[0].n === 15, "vê também o rascunho");
ok((await q("select count(*)::int n from profiles"))[0].n === 3, "vê todos os perfis");
await q("update doramas set visibility='publicado' where id=$1", [draftId]);
ok((await q("select published_at is not null p from doramas where id=$1", [draftId]))[0].p, "publicar registra a data de publicação");
const [{ id: plan }] = await q("select id from plans where name='Mensal'");
await q("insert into subscriptions (user_id, plan_id, expires_at) values ($1, $2, now() + interval '30 days')", [ana, plan]);
ok(true, "libera acesso manual para a Ana (30 dias)");
await expectError("insert into subscriptions (user_id, plan_id) values ($1, $2)", "assinatura sem validade e sem vitalício é recusada", [beto, plan]);
await q("insert into episodes (season_id, number, title) select id, 1, 'Ep 1' from seasons where dorama_id=$1", [draftId]);
const [{ id: epNew }] = await q("select e.id from episodes e join seasons s on s.id=e.season_id where s.dorama_id=$1", [draftId]);
await q("insert into videos (episode_id, storage_key, status) values ($1, 'doramas/x/t1/e01/video.mp4', 'enviando')", [epNew]);
ok((await q("select video_ready from episodes where id=$1", [epNew]))[0].video_ready === false, "vídeo enviando → episódio indisponível");
await q("update videos set status='pronto' where episode_id=$1", [epNew]);
ok((await q("select video_ready from episodes where id=$1", [epNew]))[0].video_ready === true, "vídeo pronto → episódio disponível");
await q("delete from videos where episode_id=$1", [epNew]);
ok((await q("select video_ready from episodes where id=$1", [epNew]))[0].video_ready === false, "vídeo excluído → episódio indisponível");
await expectError("insert into doramas (slug, title) values ('novo', 'x')", "slug reservado 'novo' é recusado");
await expectError("insert into doramas (slug, title) values ('Com Espaço', 'x')", "slug inválido é recusado");

console.log("\n▶ Ana depois da liberação");
await as("authenticated", ana);
ok((await q("select public.has_active_access() a"))[0].a === true, "agora tem acesso");
const acc = (await q("select * from public.my_access()"))[0];
ok(acc.plan_name === "Mensal" && acc.screens === 1 && acc.has_access, `my_access(): ${acc.plan_name}, ${acc.screens} tela`);
ok((await q("select count(*)::int n from subscriptions"))[0].n === 1, "vê só a própria assinatura");
ok((await q("update subscriptions set expires_at = now() + interval '10 years' where user_id=$1 returning user_id", [ana])).length === 0, "não estende o próprio prazo");

console.log("\n▶ Assinatura vencida");
await asOwner();
await q("update subscriptions set expires_at = now() - interval '1 day' where user_id=$1", [ana]);
await as("authenticated", ana);
ok((await q("select public.has_active_access() a"))[0].a === false, "vencida → sem acesso");

console.log("\n▶ Remover demonstração");
await asOwner();
await db.exec(readFileSync(`${root}/supabase/remover-demo.sql`, "utf8"));
ok((await q("select count(*)::int n from doramas"))[0].n === 1, "sobra só o dorama criado fora da demo");
ok((await q("select count(*)::int n from plans where name='Mensal'"))[0].n === 1, "plano em uso (Mensal) é mantido");

console.log(`\n${fail === 0 ? "✅" : "❌"} ${pass} testes passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
