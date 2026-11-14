// Supabase simulado (REST + Auth) sobre Postgres local, com RLS valendo.
// Suficiente para testar: catálogo, login só com e-mail, login do admin, sessão,
// Minha Lista, perfil e "Liberar acesso".
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import http from "node:http";

const root = process.argv[2];
const SECRET = "test-secret";
const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb, password text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated, service_role;
  grant all on all tables in schema public to service_role;
`);
for (const f of ["migrations/0001_estrutura_inicial.sql", "migrations/0002_login_por_email.sql", "seed-demo.sql"])
  await db.exec(readFileSync(`${root}/supabase/${f}`, "utf8"));
await db.exec(`grant all on all tables in schema public to service_role;`);
await db.exec(`
  insert into auth.users (email, password, raw_user_meta_data) values
    ('cliente@teste.com', null, '{"name":"Cliente Teste"}'),
    ('vencido@teste.com', null, '{}'),
    ('admin@teste.com', 'senha123', '{"name":"Admin"}');
  insert into admins select id from auth.users where email='admin@teste.com';
  insert into subscriptions (user_id, plan_id, expires_at)
    select u.id, p.id, now() + interval '20 days' from auth.users u, plans p where u.email='cliente@teste.com' and p.name='Mensal';
  insert into subscriptions (user_id, plan_id, expires_at)
    select u.id, p.id, now() - interval '2 days' from auth.users u, plans p where u.email='vencido@teste.com' and p.name='Mensal';
  update settings set value='"https://pagamento.exemplo/comprar"' where key='purchase_url';
`);

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwtFor = (u) =>
  `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: u.id, email: u.email, role: "authenticated", aud: "authenticated", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, session_id: "s1" })}.sig`;
const decode = (t) => { try { return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()); } catch { return null; } };
const userJson = (u) => ({ id: u.id, aud: "authenticated", role: "authenticated", email: u.email, email_confirmed_at: new Date().toISOString(), app_metadata: { provider: "email" }, user_metadata: u.raw_user_meta_data ?? {}, created_at: new Date().toISOString() });
const session = (u) => ({ access_token: jwtFor(u), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "r-" + u.id, user: userJson(u) });
const tokens = new Map(); // hashed_token -> user id

const asRole = async (req) => {
  const auth = req.headers.authorization?.replace(/^Bearer /, "");
  const claims = auth && auth.split(".").length === 3 ? decode(auth) : null;
  if (claims?.sub) { await db.exec(`reset role; select set_config('request.jwt.claim.sub','${claims.sub}',false); set role authenticated;`); return "user"; }
  if (req.headers.apikey === SECRET || auth === SECRET) { await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false);`); return "service"; }
  await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false); set role anon;`); return "anon";
};
const ident = (s) => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error("bad ident " + s); return `"${s}"`; };

function where(params, values) {
  const conds = [];
  for (const [k, v] of params) {
    if (["select", "order", "limit", "on_conflict", "columns"].includes(k)) continue;
    const m = /^(eq|neq|gte|lte|gt|lt|ilike|is)\.(.*)$/.exec(v);
    if (!m) continue;
    const op = { eq: "=", neq: "<>", gte: ">=", lte: "<=", gt: ">", lt: "<", ilike: "ilike", is: "is" }[m[1]];
    if (m[1] === "is") { conds.push(`${ident(k)} is ${m[2] === "null" ? "null" : m[2]}`); continue; }
    values.push(m[2]); conds.push(`${ident(k)}::text ${op} $${values.length}`);
  }
  return conds.length ? ` where ${conds.join(" and ")}` : "";
}

const DORAMAS_SQL = readFileSync(new URL("./fake-supabase.mjs", import.meta.url), "utf8").match(/const DORAMAS_SQL = `([\s\S]*?)`;/)[1];

const send = (res, code, body, headers = {}) => {
  res.writeHead(code, { "content-type": "application/json", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const readBody = (req) => new Promise((r) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => r(d ? JSON.parse(d) : {})); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  try {
    // ---------------- AUTH ----------------
    if (p === "/auth/v1/admin/generate_link" && req.method === "POST") {
      const { email } = await readBody(req);
      await db.exec("reset role");
      const { rows: [u] } = await db.query("select * from auth.users where lower(email)=lower($1)", [email]);
      if (!u) return send(res, 404, { msg: "User not found" });
      const hashed = "h-" + Math.random().toString(36).slice(2);
      tokens.set(hashed, u.id);
      return send(res, 200, { ...userJson(u), action_link: "x", email_otp: "000000", hashed_token: hashed, verification_type: "magiclink", redirect_to: "" });
    }
    if (p === "/auth/v1/admin/users" && req.method === "POST") {
      const body = await readBody(req);
      await db.exec("reset role");
      const { rows: [u] } = await db.query("insert into auth.users (email, raw_user_meta_data) values (lower($1), $2) returning *", [body.email, body.user_metadata ?? {}]);
      return send(res, 200, userJson(u));
    }
    if (p === "/auth/v1/verify" && req.method === "POST") {
      const body = await readBody(req);
      const id = tokens.get(body.token_hash); tokens.delete(body.token_hash);
      if (!id) return send(res, 403, { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" });
      await db.exec("reset role");
      const { rows: [u] } = await db.query("select * from auth.users where id=$1", [id]);
      return send(res, 200, session(u));
    }
    if (p === "/auth/v1/token" && url.searchParams.get("grant_type") === "password") {
      const { email, password } = await readBody(req);
      await db.exec("reset role");
      const { rows: [u] } = await db.query("select * from auth.users where lower(email)=lower($1)", [email]);
      if (!u || !u.password || u.password !== password) return send(res, 400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
      return send(res, 200, session(u));
    }
    if (p === "/auth/v1/user") {
      const c = decode(req.headers.authorization?.replace(/^Bearer /, "") ?? "");
      if (!c?.sub) return send(res, 401, { msg: "invalid JWT" });
      await db.exec("reset role");
      const { rows: [u] } = await db.query("select * from auth.users where id=$1", [c.sub]);
      return u ? send(res, 200, userJson(u)) : send(res, 404, { msg: "not found" });
    }
    if (p === "/auth/v1/logout") return send(res, 204);
    if (p.includes("jwks")) return send(res, 200, { keys: [] });

    // ---------------- REST ----------------
    const m = /^\/rest\/v1\/(rpc\/)?([a-z_]+)$/.exec(p);
    if (!m) { console.log("404", req.method, p); return send(res, 404, { message: "not found" }); }
    await asRole(req);
    const [, isRpc, name] = m;
    const values = [];
    let rows;
    if (isRpc) {
      ({ rows } = await db.query(`select * from public.${ident(name)}()`));
      const single = rows.length === 1 && Object.keys(rows[0]).length === 1 && name === "is_admin";
      return send(res, 200, single ? Object.values(rows[0])[0] : rows);
    }
    if (req.method === "GET" && name === "doramas") {
      ({ rows } = await db.query(DORAMAS_SQL)); return send(res, 200, rows[0].j);
    }
    if (req.method === "GET") {
      const cols = (url.searchParams.get("select") ?? "*").split(",").map((c) => c.trim()).filter(Boolean);
      const sel = cols[0] === "*" ? "*" : cols.map(ident).join(", ");
      let sql = `select ${sel} from public.${ident(name)}${where(url.searchParams, values)}`;
      const orders = url.searchParams.getAll("order").flatMap((o) => o.split(","));
      if (orders.length) sql += " order by " + orders.map((o) => { const [c, dir] = o.split("."); return `${ident(c)} ${dir === "desc" ? "desc" : "asc"}`; }).join(", ");
      if (url.searchParams.get("limit")) sql += ` limit ${Number(url.searchParams.get("limit"))}`;
      ({ rows } = await db.query(sql, values));
      if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) {
        if (rows.length !== 1) return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `Results contain ${rows.length} rows` });
        return send(res, 200, rows[0]);
      }
      return send(res, 200, rows);
    }
    if (req.method === "POST") {
      const body = await readBody(req);
      const items = Array.isArray(body) ? body : [body];
      const conflict = url.searchParams.get("on_conflict");
      const out = [];
      for (const it of items) {
        const keys = Object.keys(it);
        const vals = keys.map((k) => it[k]);
        let sql = `insert into public.${ident(name)} (${keys.map(ident).join(",")}) values (${keys.map((_, i) => `$${i + 1}`).join(",")})`;
        if (conflict) {
          const ck = conflict.split(",");
          const upd = keys.filter((k) => !ck.includes(k));
          sql += ` on conflict (${ck.map(ident).join(",")}) do ${upd.length ? "update set " + upd.map((k) => `${ident(k)}=excluded.${ident(k)}`).join(",") : "nothing"}`;
        }
        sql += " returning *";
        const r = await db.query(sql, vals); out.push(...r.rows);
      }
      if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) return send(res, 201, out[0]);
      return send(res, 201, out);
    }
    if (req.method === "PATCH" || req.method === "DELETE") {
      const body = req.method === "PATCH" ? await readBody(req) : {};
      const keys = Object.keys(body);
      keys.forEach((k) => values.push(body[k]));
      const set = keys.map((k, i) => `${ident(k)}=$${i + 1}`).join(", ");
      const sql = req.method === "PATCH"
        ? `update public.${ident(name)} set ${set}${where(url.searchParams, values)} returning *`
        : `delete from public.${ident(name)}${where(url.searchParams, values)} returning *`;
      ({ rows } = await db.query(sql, values));
      if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) return send(res, 200, rows[0] ?? null);
      return send(res, 200, rows);
    }
    send(res, 405, {});
  } catch (e) {
    console.log("ERR", req.method, p, e.message);
    send(res, 400, { code: e.code ?? "XX000", message: e.message });
  } finally {
    await db.exec("reset role").catch(() => {});
  }
}).listen(54321, () => console.log("fake supabase v2 on :54321"));
