"use server";

/**
 * AÇÕES DA CONTA DO CLIENTE: nome, telas em uso.
 * Tudo roda com a sessão da própria pessoa — o banco (RLS) garante que
 * ninguém mexe na conta de outra pessoa.
 */
import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";

async function db() {
  const { createSessionClient } = await import("@/lib/supabase/server");
  return createSessionClient();
}

export type PingResult = { ok: true } | { ok: false; reason: "desconectado" | "login" | "erro" };

/** Sinal do player: "esta tela está assistindo" (e confere se o login ainda vale). */
export async function pingTela(deviceId: string, episodeId: string | null, agent: string): Promise<PingResult> {
  if (!isSupabaseConfigured) return { ok: true };
  const supabase = await db();
  const { data, error } = await supabase.rpc("playback_ping", {
    p_device: deviceId,
    p_episode: episodeId && /^[0-9a-f-]{36}$/.test(episodeId) ? episodeId : null,
    p_agent: agent.slice(0, 300),
  });
  if (error) return { ok: true }; // falha de rede/banco não interrompe quem está assistindo
  return data as PingResult;
}

/** Libera a tela ao sair do player. */
export async function pararTela(deviceId: string) {
  if (!isSupabaseConfigured) return;
  const supabase = await db();
  await supabase.rpc("playback_stop", { p_device: deviceId });
}

/** Desconecta outro aparelho logado (página "Telas conectadas"). */
export async function desconectarTela(sessionId: string): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured) return { ok: true };
  if (!/^[0-9a-f-]{36}$/.test(sessionId)) return { ok: false };
  const supabase = await db();
  const { data, error } = await supabase.rpc("session_revoke", { p_session: sessionId });
  revalidatePath("/perfil/telas");
  return { ok: !error && data === true };
}

export async function atualizarNome(name: string): Promise<{ ok: boolean; error?: string }> {
  const clean = name.replace(/\s+/g, " ").trim().slice(0, 60);
  if (clean.length < 2) return { ok: false, error: "Digite seu nome." };
  if (!isSupabaseConfigured) return { ok: true };
  const supabase = await db();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return { ok: false, error: "Entre de novo para continuar." };
  const { error } = await supabase.from("profiles").update({ name: clean }).eq("id", uid);
  revalidatePath("/perfil");
  return error ? { ok: false, error: "Não foi possível salvar agora." } : { ok: true };
}
