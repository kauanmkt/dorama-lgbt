/**
 * WEBHOOK DA LOWIFY — libera ou corta o acesso automaticamente.
 *
 * Endereço (cadastrado na Lowify):
 *   https://SEU-SITE/api/webhooks/lowify?token=LOWIFY_WEBHOOK_TOKEN
 *
 *  - Venda paga (ex.: "sale.paid")  → cria a conta (se não existir) e libera o
 *    plano ligado ao produto. Renovação (nova venda) soma os dias.
 *  - Reembolso / chargeback → corta o acesso na hora.
 *  - Cancelamento de assinatura → não corta: vale até a data já paga.
 *  - Outros avisos (pix gerado, boleto, etc.) → só registra, não muda nada.
 *
 * Cada aviso fica registrado na tabela "payments". Avisos repetidos do mesmo
 * pedido não liberam dias em dobro.
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { grantAccess, isValidEmail, normalizeEmail, revokeAccess } from "@/lib/access";
import { classify, matchesAnyId, pickPlan, type LowifyPayload, type PlanCandidate } from "@/lib/lowify";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const PROVIDER = "lowify";

function tokenOk(req: NextRequest) {
  const expected = (process.env.LOWIFY_WEBHOOK_TOKEN ?? "").trim();
  const given = (req.nextUrl.searchParams.get("token") ?? req.headers.get("x-webhook-token") ?? "").trim();
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

const json = (body: object, status = 200) => NextResponse.json(body, { status });

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured || !process.env.LOWIFY_WEBHOOK_TOKEN) {
    return json({ error: "Integração não configurada" }, 503);
  }
  if (!tokenOk(req)) return json({ error: "Token inválido" }, 401);

  let payload: LowifyPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const email = normalizeEmail(payload.customer?.email ?? "");
  const orderNumber = String(payload.order_id ?? "").trim();
  // Produto principal e order bump podem vir no MESMO pedido: a chave junta os dois
  const orderId = payload.product?.id != null ? `${orderNumber}:${payload.product.id}` : orderNumber;
  if (!orderNumber || !isValidEmail(email)) return json({ error: "Pedido sem order_id ou e-mail válido" }, 400);

  const action = classify(payload);
  const admin = createAdminClient();
  const amountCents = Math.max(0, Math.round(Number(payload.sale_amount ?? payload.product?.price ?? 0) * 100) || 0);

  // Pedido já registrado?
  const { data: existing } = await admin
    .from("payments")
    .select("id, status, plan_id, user_id, paid_at")
    .eq("provider", PROVIDER)
    .eq("external_id", orderId)
    .maybeSingle();

  const record = async (status: string, planId: string | null, userId: string | null) => {
    const row = {
      provider: PROVIDER,
      external_id: orderId,
      amount_cents: amountCents,
      status,
      plan_id: planId ?? existing?.plan_id ?? null,
      user_id: userId ?? existing?.user_id ?? null,
      paid_at: status === "aprovado" ? new Date().toISOString() : undefined,
      raw: payload,
    };
    const { error } = existing
      ? await admin.from("payments").update(row).eq("id", existing.id)
      : await admin.from("payments").insert(row);
    if (error) console.error(`[lowify] Erro ao registrar pedido ${orderId}: ${error.message}`);
  };

  // ---- "Assista na televisão" (order bump) ----
  const { data: tvSetting } = await admin.from("settings").select("value").eq("key", "tv_product_ids").maybeSingle();
  const tvIds = Array.isArray(tvSetting?.value) ? (tvSetting.value as unknown[]).map(String) : [];
  if (tvIds.length && matchesAnyId(payload, tvIds) && (action === "pago" || action === "reembolso")) {
    if (action === "pago" && existing?.status === "aprovado") return json({ ok: true, action: "ja_processado" });
    if (action === "reembolso" && existing?.status === "reembolsado") return json({ ok: true, action: "ja_processado" });
    const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    const { data: sub } = profile
      ? await admin.from("subscriptions").select("user_id").eq("user_id", profile.id).maybeSingle()
      : { data: null };
    if (!profile || !sub) {
      // O aviso do plano ainda não chegou: pede para a Lowify tentar de novo daqui a pouco
      return json({ error: "Assinatura ainda não criada; tente novamente" }, 409);
    }
    await admin.from("subscriptions").update({ tv_access: action === "pago" }).eq("user_id", profile.id);
    await record(action === "pago" ? "aprovado" : "reembolsado", null, profile.id);
    return json({ ok: true, action: action === "pago" ? "tv_liberada" : "tv_removida" });
  }

  // ---- Tela extra (order bump) ----
  const { data: extraSetting } = await admin.from("settings").select("value").eq("key", "extra_screen_product_ids").maybeSingle();
  const extraIds = Array.isArray(extraSetting?.value) ? (extraSetting.value as unknown[]).map(String) : [];
  if (extraIds.length && matchesAnyId(payload, extraIds) && (action === "pago" || action === "reembolso")) {
    if (action === "pago" && existing?.status === "aprovado") return json({ ok: true, action: "ja_processado" });
    if (action === "reembolso" && existing?.status === "reembolsado") return json({ ok: true, action: "ja_processado" });
    const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    const { data: sub } = profile
      ? await admin.from("subscriptions").select("extra_screens").eq("user_id", profile.id).maybeSingle()
      : { data: null };
    if (!profile || !sub) {
      // O aviso do plano ainda não chegou: pede para a Lowify tentar de novo daqui a pouco
      return json({ error: "Assinatura ainda não criada; tente novamente" }, 409);
    }
    const extra = Math.max(0, Math.min(20, sub.extra_screens + (action === "pago" ? 1 : -1)));
    await admin.from("subscriptions").update({ extra_screens: extra }).eq("user_id", profile.id);
    await record(action === "pago" ? "aprovado" : "reembolsado", null, profile.id);
    return json({ ok: true, action: action === "pago" ? "tela_extra_adicionada" : "tela_extra_removida", extra_screens: extra });
  }

  if (action === "ignorar") {
    if (!existing) await record("pendente", null, null);
    return json({ ok: true, action: "ignorado", event: payload.event ?? payload.status ?? null });
  }

  if (action === "reembolso") {
    const result = await revokeAccess(email, `Lowify: ${payload.event ?? payload.status} (pedido ${orderId})`);
    await record("reembolsado", null, null);
    return json({ ok: true, action: "acesso_cortado", found: result.found });
  }

  if (action === "cancelado") {
    await record("cancelado", null, null);
    return json({ ok: true, action: "cancelamento_registrado" });
  }

  // ---- Venda paga ----
  // Aviso repetido (minutos/horas depois) não soma dias de novo. Mas na assinatura
  // recorrente (Pix automático/cartão) a Lowify pode mandar a RENOVAÇÃO com o mesmo
  // número de pedido: se o último pagamento desse pedido foi há 20+ dias, é renovação.
  if (existing?.status === "aprovado") {
    const lastPaid = existing.paid_at ? Date.parse(existing.paid_at) : NaN;
    const isRenewal = Number.isFinite(lastPaid) && Date.now() - lastPaid > 20 * 86_400_000;
    if (!isRenewal) return json({ ok: true, action: "ja_processado" });
  }

  const { data: plans } = await admin
    .from("plans")
    .select("id, name, price_cents, active, external_product_ids");
  const plan = pickPlan((plans ?? []) as PlanCandidate[], payload, amountCents);
  if (!plan) {
    await record("pendente", null, null);
    console.error(`[lowify] Pedido ${orderId}: nenhum plano ligado ao produto ${payload.product?.id}`);
    // 200 para a Lowify não ficar reenviando; o pedido fica registrado para revisão
    return json({ ok: false, action: "sem_plano", productId: payload.product?.id ?? null });
  }

  try {
    const granted = await grantAccess({
      email,
      name: payload.customer?.name?.trim() || undefined,
      planId: plan.id,
      source: "gateway",
      notes: `Lowify · pedido ${orderId}`,
    });
    await record("aprovado", plan.id, granted.userId);
    return json({ ok: true, action: "acesso_liberado", plan: plan.name, created: granted.created });
  } catch (e) {
    console.error(`[lowify] Pedido ${orderId}:`, e);
    // 500 → a Lowify tenta de novo mais tarde
    return json({ error: e instanceof Error ? e.message : "Erro ao liberar" }, 500);
  }
}

/** Teste rápido no navegador: mostra se o endereço está ativo. */
export async function GET(req: NextRequest) {
  if (!process.env.LOWIFY_WEBHOOK_TOKEN) return json({ error: "Integração não configurada" }, 503);
  if (!tokenOk(req)) return json({ error: "Token inválido" }, 401);
  return json({ ok: true, message: "Webhook da Lowify ativo" });
}
