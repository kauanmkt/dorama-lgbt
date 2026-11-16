"use server";

/**
 * CHAT DE SUPORTE.
 * Cliente: manda e lê as mensagens da própria conversa.
 * Admin: lê e responde todas. O banco confere quem é quem.
 */
import { requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type ChatMessage = { id: string; sender: "cliente" | "suporte"; body: string; createdAt: string };

async function db() {
  const { createSessionClient } = await import("@/lib/supabase/server");
  return createSessionClient();
}

const mapMsg = (m: { id: string; sender: string; body: string; created_at: string }): ChatMessage => ({
  id: m.id,
  sender: m.sender as ChatMessage["sender"],
  body: m.body,
  createdAt: m.created_at,
});

// ---------------- Cliente ----------------

export async function minhasMensagens(): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await db();
  const { data: thread } = await supabase.from("support_threads").select("id, unread_client").maybeSingle();
  if (!thread) return [];
  const { data } = await supabase
    .from("support_messages")
    .select("id, sender, body, created_at")
    .eq("thread_id", thread.id)
    .order("created_at")
    .limit(500);
  if (thread.unread_client > 0) await supabase.rpc("support_mark_read", {});
  return (data ?? []).map(mapMsg);
}

export async function enviarMensagem(body: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: true };
  const supabase = await db();
  const { error } = await supabase.rpc("support_send", { p_body: body });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function suporteNaoLidas(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const supabase = await db();
  const { data } = await supabase.from("support_threads").select("unread_client").maybeSingle();
  return data?.unread_client ?? 0;
}

// ---------------- Admin ----------------

export async function mensagensDaConversa(threadId: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured) return [];
  await requireAdmin();
  const supabase = await db();
  const { data } = await supabase
    .from("support_messages")
    .select("id, sender, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at")
    .limit(500);
  await supabase.rpc("support_mark_read", { p_thread: threadId });
  return (data ?? []).map(mapMsg);
}

export async function responderConversa(threadId: string, body: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: true };
  await requireAdmin();
  const supabase = await db();
  const { error } = await supabase.rpc("support_reply", { p_thread: threadId, p_body: body });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function marcarConversa(threadId: string, status: "aberto" | "resolvido") {
  if (!isSupabaseConfigured) return;
  await requireAdmin();
  const supabase = await db();
  await supabase.rpc("support_set_status", { p_thread: threadId, p_status: status });
}
