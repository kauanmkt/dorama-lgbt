"use server";

/**
 * AÇÕES DE NOTIFICAÇÃO
 * Cliente: ativar no aparelho, preferências, sino.
 * Painel: enviar aviso para todos.
 */
import { requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

async function db() {
  const { createSessionClient } = await import("@/lib/supabase/server");
  return createSessionClient();
}

async function myId(): Promise<string | null> {
  const supabase = await db();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

export type Prefs = { lancamentos: boolean; continuar: boolean; saudade: boolean; avisos: boolean; suporte: boolean };
const DEFAULT_PREFS: Prefs = { lancamentos: true, continuar: true, saudade: true, avisos: true, suporte: true };

export type InboxItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  image: string | null;
  read: boolean;
  createdAt: string;
};

// ---------------- Cliente ----------------

export async function chavePublicaPush(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { getPushPublicKey } = await import("@/lib/push");
  return getPushPublicKey();
}

export async function ativarPush(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, agent: string) {
  if (!isSupabaseConfigured) return { ok: true };
  if (!/^https:\/\//.test(sub?.endpoint ?? "") || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
  const supabase = await db();
  const { data, error } = await supabase.rpc("push_subscribe", {
    p_endpoint: sub.endpoint.slice(0, 1000),
    p_p256dh: sub.keys.p256dh.slice(0, 200),
    p_auth: sub.keys.auth.slice(0, 100),
    p_agent: agent.slice(0, 300),
  });
  return { ok: !error && data === true };
}

export async function desativarPush(endpoint: string) {
  if (!isSupabaseConfigured) return { ok: true };
  const supabase = await db();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: !error };
}

/** Manda uma notificação de teste para os aparelhos da própria pessoa. */
export async function testarPush(): Promise<{ ok: boolean; devices: number }> {
  if (!isSupabaseConfigured) return { ok: true, devices: 0 };
  const uid = await myId();
  if (!uid) return { ok: false, devices: 0 };
  const { notify } = await import("@/lib/push");
  const r = await notify([uid], {
    kind: "teste",
    title: "Notificações ativadas 💜",
    body: "Pronto! Você vai saber na hora quando chegar dorama novo.",
    url: "/notificacoes",
  });
  return { ok: true, devices: r.devices };
}

export async function minhasPreferencias(): Promise<Prefs> {
  if (!isSupabaseConfigured) return DEFAULT_PREFS;
  const supabase = await db();
  const { data } = await supabase.from("notification_prefs").select("lancamentos, continuar, saudade, avisos, suporte").maybeSingle();
  return { ...DEFAULT_PREFS, ...(data ?? {}) };
}

export async function salvarPreferencias(prefs: Prefs) {
  if (!isSupabaseConfigured) return { ok: true };
  const uid = await myId();
  if (!uid) return { ok: false };
  const supabase = await db();
  const clean = Object.fromEntries(Object.keys(DEFAULT_PREFS).map((k) => [k, Boolean(prefs[k as keyof Prefs])]));
  const { error } = await supabase
    .from("notification_prefs")
    .upsert({ user_id: uid, ...clean, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  return { ok: !error };
}

export async function minhasNotificacoes(): Promise<InboxItem[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await db();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, url, image, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  return (data ?? []).map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    url: n.url,
    image: n.image,
    read: Boolean(n.read_at),
    createdAt: n.created_at,
  }));
}

export async function notificacoesNaoLidas(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const supabase = await db();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}

export async function marcarNotificacoesLidas() {
  if (!isSupabaseConfigured) return;
  const supabase = await db();
  await supabase.rpc("notifications_mark_read", { p_ids: null });
}

// ---------------- Painel ----------------

export async function enviarAviso(input: { title: string; body: string; url: string }) {
  await requireAdmin();
  const title = input.title.replace(/\s+/g, " ").trim().slice(0, 80);
  const body = input.body.replace(/\s+/g, " ").trim().slice(0, 240);
  let url = input.url.trim() || "/";
  if (/^https?:\/\//i.test(url)) {
    try {
      const u = new URL(url);
      url = u.pathname + u.search; // só links do próprio site
    } catch {
      url = "/";
    }
  }
  if (!url.startsWith("/")) url = `/${url}`;
  if (title.length < 3) return { ok: false, error: "Escreva um título." };
  if (!isSupabaseConfigured) return { ok: true, people: 0, devices: 0 };

  const { notify, recipients } = await import("@/lib/push");
  try {
    const to = await recipients("aviso");
    const r = await notify(to, { kind: "aviso", ref: `aviso:${crypto.randomUUID()}`, title, body, url });
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Não foi possível enviar agora." };
  }
}
