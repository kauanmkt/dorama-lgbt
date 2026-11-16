"use server";

/**
 * AÇÕES DO PAINEL (executadas no servidor).
 * Toda ação confere de novo se quem pede é admin — nunca confia só na tela.
 * Além disso, o RLS do banco também bloqueia quem não for admin.
 */
import { requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Plan } from "@/types/admin";

type Result = { ok: true; message?: string } | { ok: false; error: string };

const demo = (): Result => ({ ok: true, message: "Modo demonstração: nada foi salvo." });

async function session() {
  await requireAdmin();
  const { createSessionClient } = await import("@/lib/supabase/server");
  return createSessionClient();
}

// ============ Usuários / acesso ============

/** "Liberar acesso" manual: cria a conta (se precisar) e ativa o plano. */
export async function liberarAcesso(input: { email: string; name?: string; planId: string }): Promise<Result> {
  if (!isSupabaseConfigured) return demo();
  await requireAdmin();
  try {
    const { grantAccess } = await import("@/lib/access");
    const r = await grantAccess({ ...input, source: "manual" });
    return {
      ok: true,
      message: r.created ? `Conta criada e acesso liberado para ${input.email}` : `Acesso liberado para ${input.email}`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao liberar acesso." };
  }
}

/** Salva as alterações da gaveta do usuário (plano, validade, vitalício, telas, suspensão). */
export async function salvarAcesso(input: {
  userId: string;
  planId?: string;
  lifetime: boolean;
  expiresAt?: string;
  extraScreens: number;
  suspended: boolean;
}): Promise<Result> {
  if (!isSupabaseConfigured) return demo();
  const supabase = await session();

  if (!input.planId) {
    const { error } = await supabase.from("subscriptions").delete().eq("user_id", input.userId);
    return error ? { ok: false, error: error.message } : { ok: true, message: "Plano removido" };
  }
  if (!input.lifetime && !input.expiresAt) return { ok: false, error: "Defina a validade ou marque como vitalício." };

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: input.userId,
      plan_id: input.planId,
      lifetime: input.lifetime,
      expires_at: input.lifetime ? null : input.expiresAt,
      extra_screens: Math.max(0, Math.min(20, Math.round(input.extraScreens))),
      status: input.suspended ? "suspensa" : "ativa",
    },
    { onConflict: "user_id" },
  );
  return error ? { ok: false, error: error.message } : { ok: true, message: "Alterações salvas" };
}

/** Desconecta o cliente de todos os aparelhos (ele precisa entrar de novo). */
export async function desconectarTelas(userId: string): Promise<Result> {
  if (!isSupabaseConfigured) return demo();
  const supabase = await session();
  const { error } = await supabase.rpc("admin_revoke_sessions", { p_user: userId });
  return error ? { ok: false, error: error.message } : { ok: true, message: "Telas desconectadas" };
}

// ============ Planos ============

export async function salvarPlano(plan: Plan & { isNew?: boolean }): Promise<Result & { id?: string }> {
  if (!isSupabaseConfigured) return demo();
  const supabase = await session();
  const row = {
    name: plan.name.trim(),
    description: plan.description.trim(),
    price_cents: Math.max(0, Math.round(plan.priceCents)),
    type: plan.type,
    duration_days: plan.type === "recorrente" ? plan.durationDays ?? 30 : null,
    screens: Math.max(1, Math.min(20, plan.screens)),
    active: plan.active,
    highlight: plan.highlight ?? false,
    external_product_ids: [...new Set((plan.productIds ?? []).map((x) => x.trim()).filter(Boolean))].slice(0, 20),
  };
  const { data, error } = plan.isNew
    ? await supabase.from("plans").insert(row).select("id").single()
    : await supabase.from("plans").update(row).eq("id", plan.id).select("id").single();
  return error ? { ok: false, error: error.message } : { ok: true, id: data.id };
}

export async function alternarPlano(id: string, active: boolean): Promise<Result> {
  if (!isSupabaseConfigured) return demo();
  const supabase = await session();
  const { error } = await supabase.from("plans").update({ active }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}
