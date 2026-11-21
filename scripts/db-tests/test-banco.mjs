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
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, created_at timestamptz default now());
  grant execute on function auth.jwt() to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated, service_role;
`);

const as = async (role, uid) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false); set role ${role};`);
};
const asSess = async (uid, sid) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); select set_config('request.jwt.claims', '{"session_id":"${sid}"}', false); set role authenticated;`);
};
const asOwner = () => db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);

console.log("\n▶ Aplicando migração");
await db.exec(readFileSync(`${root}/supabase/migrations/0001_estrutura_inicial.sql`, "utf8"));
await db.exec(readFileSync(`${root}/supabase/migrations/0002_login_por_email.sql`, "utf8"));
await db.exec(readFileSync(`${root}/supabase/migrations/0003_restringir_funcoes.sql`, "utf8"));
await db.exec(readFileSync(`${root}/supabase/migrations/0004_cadastro_pelo_painel.sql`, "utf8"));
await db.exec(readFileSync(`${root}/supabase/migrations/0009_limite_de_telas.sql`, "utf8"));
await db.exec(readFileSync(`${root}/supabase/migrations/0010_suporte.sql`, "utf8"));
await db.exec(readFileSync(`${root}/supabase/migrations/0011_telas_por_login.sql`, "utf8"));
await db.exec(readFileSync(`${root}/supabase/migrations/0012_notificacoes.sql`, "utf8"));
await db.exec(readFileSync(`${root}/supabase/migrations/0013_classificacao_18.sql`, "utf8"));
await db.exec(readFileSync(`${root}/supabase/migrations/0014_assistir_na_tv.sql`, "utf8"));
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
await expectError(`select public.admin_save_dorama('{"slug":"x","title":"x"}'::jsonb)`, "não usa a função de salvar dorama do painel");
await expectError("select public.admin_set_featured('{}'::uuid[])", "não mexe nos destaques");
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

console.log("\n▶ Cadastro pelo painel (admin_save_dorama)");
const save = async (payload) => (await q("select public.admin_save_dorama($1::jsonb) r", [JSON.stringify(payload)]))[0].r;
const base = {
  slug: "teste-painel", title: "Teste Painel", synopsis: "Sinopse", year: 2026, country: "Japão",
  age_rating: "16", status: "em_exibicao", visibility: "rascunho", is_featured: false, is_new: true, art_seed: 3,
  categories: ["bl", "romance"],
  seasons: [{ number: 1, episodes: [
    { number: 1, title: "Um", synopsis: "", duration_min: 40 },
    { number: 2, title: "Dois", synopsis: "", duration_min: 42 },
  ] }],
};
const created = await save(base);
ok(created.id && created.slug === "teste-painel", "cria dorama novo com temporada e 2 episódios");
const eps = async () => q("select e.id, e.number, e.title, s.number season from episodes e join seasons s on s.id=e.season_id where s.dorama_id=$1 order by s.number, e.number", [created.id]);
let list = await eps();
ok(list.length === 2 && list[0].title === "Um", "episódios gravados na ordem");
ok((await q("select count(*)::int n from dorama_categories where dorama_id=$1", [created.id]))[0].n === 2, "2 categorias vinculadas");
await q("insert into videos (episode_id, storage_key, status) values ($1, 'teste/um.mp4', 'pronto')", [list[0].id]);
// troca a ordem dos episódios, edita título, adiciona T2, troca categorias
await save({ ...base, id: created.id, title: "Teste Editado", visibility: "publicado", is_featured: true, categories: ["gl"],
  seasons: [
    { number: 1, episodes: [
      { id: list[0].id, number: 2, title: "Um (agora 2)", duration_min: 40 },
      { id: list[1].id, number: 1, title: "Dois (agora 1)", duration_min: 42 },
    ] },
    { number: 2, episodes: [{ id: "novo-123", number: 1, title: "T2E1", duration_min: 50 }] },
  ] });
list = await eps();
ok(list.length === 3 && list[0].title === "Dois (agora 1)" && list[1].title === "Um (agora 2)", "troca a ordem dos episódios sem conflito");
ok(list[1].id === (await q("select episode_id from videos where storage_key='teste/um.mp4'"))[0].episode_id, "episódio editado mantém o vídeo vinculado");
ok(list[2].season === 2 && list[2].title === "T2E1", "id provisório ('novo-…') vira episódio novo na temporada 2");
const d = (await q("select title, visibility, is_featured, featured_position, published_at from doramas where id=$1", [created.id]))[0];
ok(d.title === "Teste Editado" && d.visibility === "publicado" && d.published_at, "edita e publica");
ok(d.is_featured && d.featured_position > 0, `entra nos destaques no fim da fila (posição ${d.featured_position})`);
ok((await q("select c.slug from dorama_categories dc join categories c on c.id=dc.category_id where dorama_id=$1", [created.id])).map((r) => r.slug).join() === "gl", "categorias substituídas");
// remove temporada 1 inteira
await save({ ...base, id: created.id, seasons: [{ number: 2, episodes: [{ id: list[2].id, number: 1, title: "T2E1" }] }] });
list = await eps();
ok(list.length === 1 && list[0].season === 2, "temporada removida apaga os episódios dela");
ok((await q("select count(*)::int n from videos where storage_key='teste/um.mp4'"))[0].n === 0, "…e o vínculo do vídeo");
await expectError(`select public.admin_save_dorama('${JSON.stringify({ ...base, slug: "amor-em-seul" })}'::jsonb)`, "endereço repetido é recusado");
await expectError(`select public.admin_save_dorama('${JSON.stringify({ ...base, slug: "outro", seasons: [{ number: 1, episodes: [{ number: 1, title: "a" }, { number: 1, title: "b" }] }] })}'::jsonb)`, "número de episódio repetido é recusado (e nada é salvo)");
ok((await q("select count(*)::int n from doramas where slug='outro'"))[0].n === 0, "…confirmado: nada ficou pela metade");
// destaques e categorias
const top = (await q("select id from doramas where visibility='publicado' order by title limit 2")).map((r) => r.id);
await q("select public.admin_set_featured($1::uuid[])", [top]);
const feat = await q("select id, featured_position from doramas where is_featured order by featured_position");
ok(feat.length === 2 && feat[0].id === top[0] && feat[1].featured_position === 2, "define destaques e a ordem deles");
await q("select public.admin_reorder_categories($1::text[])", [["gl", "bl"]]);
ok((await q("select slug from categories order by position, slug limit 2")).map((r) => r.slug).join() === "gl,bl", "reordena categorias");

console.log("\n▶ Ana depois da liberação");
await as("authenticated", ana);
ok((await q("select public.has_active_access() a"))[0].a === true, "agora tem acesso");
const acc = (await q("select * from public.my_access()"))[0];
ok(acc.plan_name === "Mensal" && acc.screens === 1 && acc.has_access, `my_access(): ${acc.plan_name}, ${acc.screens} tela`);
ok((await q("select count(*)::int n from subscriptions"))[0].n === 1, "vê só a própria assinatura");
ok((await q("update subscriptions set expires_at = now() + interval '10 years' where user_id=$1 returning user_id", [ana])).length === 0, "não estende o próprio prazo");

console.log("\n▶ Telas = logins (plano com 1 tela)");
await asOwner();
const novaSessao = async (uid) => (await q("insert into auth.sessions (user_id) values ($1) returning id", [uid]))[0].id;
const celular = await novaSessao(ana);
await asSess(ana, celular);
ok((await q("select public.session_login('iPhone') r"))[0].r.ok === true, "login no celular");
ok((await q("select public.session_touch() r"))[0].r.ok === true, "celular segue logado");
await asOwner(); const tv = await novaSessao(ana);
await asSess(ana, tv);
const lg = (await q("select public.session_login('TV') r"))[0].r;
ok(lg.ok === true && lg.kicked === 1, "login na TV derruba o celular (limite 1)");
ok((await q("select count(*)::int n from login_sessions"))[0].n === 1, "vê só o próprio login ativo");
await asSess(ana, celular);
const t1 = (await q("select public.session_touch() r"))[0].r;
ok(t1.ok === false && t1.reason === "desconectado", "celular descobre que foi desconectado");
ok((await q("select public.session_alive() a"))[0].a === false, "celular não toca mais vídeo");
ok((await q("select public.playback_ping('celular-aaaa1') r"))[0].r.reason === "desconectado", "player do celular é avisado");
await asOwner();
await q("update subscriptions set extra_screens = 1 where user_id=$1", [ana]);
const note = await novaSessao(ana);
await asSess(ana, note);
ok((await q("select public.session_login('Note') r"))[0].r.kicked === 0, "com 1 tela extra, TV e notebook logados juntos");
await asSess(ana, tv);
ok((await q("select public.session_touch() r"))[0].r.ok === true, "TV continua logada");
ok((await q("select public.playback_ping('tv-bbbbbbbb2') r"))[0].r.ok === true, "TV assiste normalmente");
await asOwner(); const cel2 = await novaSessao(ana);
await asSess(ana, cel2);
ok((await q("select public.session_login('iPhone') r"))[0].r.kicked === 1, "3º login derruba o mais antigo (TV)");
await asSess(ana, tv);
ok((await q("select public.session_touch() r"))[0].r.ok === false, "TV foi a desconectada");
await asSess(ana, note);
ok((await q("select public.session_touch() r"))[0].r.ok === true, "notebook segue logado");
ok((await q("select public.session_revoke($1) r", [note]))[0].r === false, "não desconecta o próprio aparelho por engano");
ok((await q("select public.session_revoke($1) r", [cel2]))[0].r === true, "desconecta outro aparelho pela página de telas");
await asSess(ana, cel2);
ok((await q("select public.session_touch() r"))[0].r.ok === false, "aparelho desconectado sai");
await asOwner(); const velho = await novaSessao(beto);
await asSess(beto, velho);
ok((await q("select public.session_touch() r"))[0].r.ok === true, "login de antes da regra é registrado sozinho");
await as("authenticated", ana);
await expectError(`select public.admin_revoke_sessions('${beto}')`, "cliente não derruba logins de outra pessoa");
await as("anon");
await expectError("select public.session_login()", "visitante não registra login");
await asOwner();
await q("delete from playback_sessions"); await q("delete from login_sessions"); await q("delete from auth.sessions"); await q("update subscriptions set extra_screens = 0");

console.log("\n▶ Notificações");
await as("authenticated", ana);
const ep = 'https://fcm.googleapis.com/fcm/send/abc123';
ok((await q("select public.push_subscribe($1,'chaveP','chaveA','Android') r", [ep]))[0].r === true, "Ana ativa notificações no celular");
ok((await q("select count(*)::int n from push_subscriptions"))[0].n === 1, "vê o próprio aparelho");
await expectError("insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ($1,'https://x','a','b')".replace("$1", `'${ana}'`), "não grava aparelho direto na tabela");
await q("insert into notification_prefs (user_id, saudade) values ($1, false)", [ana]);
await expectError(`insert into notification_prefs (user_id) values ('${beto}')`, "não mexe nas preferências de outra pessoa");
await as("authenticated", beto);
ok((await q("select count(*)::int n from push_subscriptions"))[0].n === 0, "Beto não vê o aparelho da Ana");
ok((await q("select public.push_subscribe($1,'k2','a2','iPhone') r", [ep]))[0].r === true, "mesmo aparelho entra em outra conta");
await asOwner();
ok((await q("select user_id from push_subscriptions where endpoint=$1", [ep]))[0].user_id === beto, "aparelho passa para a conta nova (sem duplicar)");
await q("update push_subscriptions set user_id=$1", [ana]);
await as("authenticated", ana);
await expectError("select * from public.notify_active_users()", "rotina automática não é chamável pelo cliente");
await asOwner();
// continuar assistindo: Ana parou em 40% há 1 dia
await q("alter table watch_progress disable trigger watch_progress_updated_at");
await q("update watch_progress set position_sec=1080, duration_sec=2700, completed=false, updated_at=now()-interval '1 day' where user_id=$1", [ana]);
const cont = await q("select * from public.notify_continue_candidates()");
ok(cont.length === 1 && cont[0].user_id === ana && cont[0].pct === 40, "Ana entra no lembrete de continuar (40%)");
await q("insert into notifications (user_id, kind, ref, title) values ($1,'continuar',$2,'x')", [ana, cont[0].ref]);
ok((await q("select * from public.notify_continue_candidates()")).length === 0, "não lembra de novo no mesmo dia");
await expectError(`insert into notifications (user_id, kind, ref, title) values ('${ana}','continuar','${cont[0].ref}','x')`, "a mesma notificação nunca é gravada duas vezes");
await q("update watch_progress set updated_at=now()-interval '2 hours' where user_id=$1", [ana]);
await q("delete from notifications");
ok((await q("select * from public.notify_continue_candidates()")).length === 0, "não lembra quem parou há poucas horas");
// saudade: Ana desligou; Beto não tem app
await q("alter table watch_progress enable trigger watch_progress_updated_at");
await q("update profiles set last_seen_at=now()-interval '9 days'");
ok((await q("select * from public.notify_comeback_candidates()")).length === 0, "saudade respeita a preferência e exige o app instalado");
await q("update notification_prefs set saudade=true where user_id=$1", [ana]);
const cb = await q("select * from public.notify_comeback_candidates()");
ok(cb.length === 1 && cb[0].days === 9, "Ana (9 dias sumida) recebe saudade");
const rec = (await q("select * from public.notify_recipients('lancamento')")).map((r) => r.user_id);
ok(rec.includes(ana) && rec.includes(adm), "lançamento vai para quem tem acesso (cliente e admin)");
await q("update notification_prefs set lancamentos=false where user_id=$1", [ana]);
ok(!(await q("select * from public.notify_recipients('lancamento')")).some((r) => r.user_id === ana), "quem desligou lançamentos não recebe");
await q("insert into notifications (user_id, kind, title) values ($1,'aviso','Promo'), ($1,'aviso','Novo'), ($2,'aviso','Do Beto')", [ana, beto]);
await as("authenticated", ana);
ok((await q("select count(*)::int n from notifications"))[0].n === 2, "sino mostra só as notificações da Ana");
ok((await q("select public.notifications_mark_read() n"))[0].n === 2, "marca tudo como lido");
await asOwner();
ok((await q("select read_at from notifications where user_id=$1", [beto]))[0].read_at === null, "não marca as do Beto");
ok((await q("select count(*)::int n from doramas where visibility='publicado' and release_notified_at is null"))[0].n > 0, "dorama publicado depois da migração fica esperando o aviso de lançamento");
await q("delete from notifications"); await q("delete from push_subscriptions"); await q("delete from notification_prefs");

console.log("\n▶ Classificação 18+");
await asOwner();
ok((await q("select pg_get_functiondef('public.admin_save_dorama(jsonb)'::regprocedure) f"))[0].f.includes("'age_rating', '18'"), "cadastro pelo painel usa 18+ quando não informado");
ok((await q("select column_default d from information_schema.columns where table_name='doramas' and column_name='age_rating'"))[0].d.includes("18"), "dorama novo nasce 18+");

console.log("\n▶ Assista na TV");
await asOwner();
const subAntes = (await q("select status, lifetime, expires_at from subscriptions where user_id=$1", [ana]))[0];
await q("update subscriptions set status='ativa', lifetime=true, tv_access=false where user_id=$1", [ana]);
await as("authenticated", ana);
ok((await q("select public.my_tv_access() a"))[0].a === false, "sem o order bump, Ana não vê o tutorial da TV");
await q(`update subscriptions set tv_access=true where user_id='${ana}'`).catch(() => {});
await asOwner();
ok((await q("select tv_access from subscriptions where user_id=$1", [ana]))[0].tv_access === false, "cliente não libera a TV sozinho");
await q("update subscriptions set tv_access=true where user_id=$1", [ana]);
await as("authenticated", ana);
ok((await q("select public.my_tv_access() a"))[0].a === true, "comprou: Ana vê o tutorial da TV");
await asOwner();
await q("update subscriptions set status='suspensa' where user_id=$1", [ana]);
await as("authenticated", ana);
ok((await q("select public.my_tv_access() a"))[0].a === false, "plano suspenso: tutorial bloqueado");
await as("authenticated", adm);
ok((await q("select public.my_tv_access() a"))[0].a === true, "admin sempre vê");
await as("anon");
await expectError("select public.my_tv_access()", "visitante não consulta");
await asOwner();
ok((await q("select value from settings where key='tv_product_ids'"))[0].value[0] === "68571", "produto 68571 já cadastrado");
await q("update subscriptions set status=$2, lifetime=$3, expires_at=$4, tv_access=false where user_id=$1", [ana, subAntes.status, subAntes.lifetime, subAntes.expires_at]);

console.log("\n▶ Chat de suporte");
await as("authenticated", ana);
const tid = (await q("select public.support_send('Oi, não consigo assistir') t"))[0].t;
ok(Boolean(tid), "cliente manda a 1ª mensagem (cria a conversa)");
await q("select public.support_send('Alguém aí?')");
ok((await q("select count(*)::int n from support_messages"))[0].n === 2, "cliente vê as próprias 2 mensagens");
await expectError(`select public.support_reply('${tid}', 'me passando pelo suporte')`, "cliente não responde como suporte");
await expectError("insert into support_messages (thread_id, sender, body) values ('" + tid + "', 'suporte', 'x')", "cliente não grava mensagem direto na tabela");
await as("authenticated", adm);
const th = (await q("select unread_admin from support_threads where id=$1", [tid]))[0];
ok(th.unread_admin === 2, "admin vê a conversa com 2 não lidas");
await q("select public.support_reply($1, 'Olá! Vamos resolver.')", [tid]);
ok((await q("select unread_admin, unread_client from support_threads where id=$1", [tid]))[0].unread_client === 1, "admin responde; cliente tem 1 não lida");
await as("authenticated", ana);
ok((await q("select sender from support_messages order by created_at desc limit 1"))[0].sender === "suporte", "cliente vê a resposta do suporte");
await q("select public.support_mark_read()");
ok((await q("select unread_client from support_threads"))[0].unread_client === 0, "cliente marca como lida");
await asOwner();

console.log("\n▶ Assinatura vencida");
await asOwner();
await q("update subscriptions set expires_at = now() - interval '1 day' where user_id=$1", [ana]);
await as("authenticated", ana);
ok((await q("select public.has_active_access() a"))[0].a === false, "vencida → sem acesso");

console.log("\n▶ Remover demonstração");
await asOwner();
await db.exec(readFileSync(`${root}/supabase/remover-demo.sql`, "utf8"));
ok((await q("select count(*)::int n from doramas"))[0].n === 2, "sobram só os doramas criados fora da demo");
ok((await q("select count(*)::int n from plans where name='Mensal'"))[0].n === 1, "plano em uso (Mensal) é mantido");

console.log(`\n${fail === 0 ? "✅" : "❌"} ${pass} testes passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
