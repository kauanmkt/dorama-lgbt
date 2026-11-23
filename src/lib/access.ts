import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * REGRAS DE ACESSO (lado do servidor, com a chave secreta).
 *
 * - grantAccess: libera/renova o acesso de um e-mail. Usada pelo painel
 *   ("Liberar acesso") e, em breve, pelo webhook da plataforma de pagamento.
 * - revokeAccess: encerra o acesso (ex.: reembolso, chargeback).
 * - findLoginAccount: confere se um e-mail pode entrar só com o e-mail.
 */

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

type Admin = ReturnType<typeof createAdminClient>;

async function findUserIdByEmail(admin: Admin, email: string): Promise<string | null> {
  // E-mails ficam sempre em minúsculas (o Supabase normaliza no cadastro)
  const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
}

/** Encontra a conta do e-mail ou cria uma nova (já confirmada). */
async function ensureUser(admin: Admin, email: string, name?: string): Promise<string> {
  const existing = await findUserIdByEmail(admin, email);
  if (existing) return existing;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: name ? { name } : undefined,
  });
  if (error || !data.user) {
    // Corrida rara: outra requisição criou a conta ao mesmo tempo
    const again = await findUserIdByEmail(admin, email);
    if (again) return again;
    throw new Error(`Não foi possível criar a conta de ${email}: ${error?.message ?? "erro desconhecido"}`);
  }
  return data.user.id;
}

export type GrantInput = {
  email: string;
  name?: string;
  planId: string;
  source: "manual" | "gateway";
  notes?: string;
  /** Acesso temporário (teste): vale só por estes minutos, em vez do período do plano */
  minutes?: number;
};

export type GrantResult = { userId: string; created: boolean; lifetime: boolean; expiresAt: string | null };

/**
 * Libera ou renova o acesso.
 * Plano com prazo: soma a duração a partir de hoje — ou a partir da validade
 * atual, se ainda estiver em dia (quem renova antes não perde dias).
 */
export async function grantAccess(input: GrantInput): Promise<GrantResult> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) throw new Error("E-mail inválido.");
  const admin = createAdminClient();

  const { data: plan, error: planError } = await admin
    .from("plans")
    .select("id, type, duration_days")
    .eq("id", input.planId)
    .maybeSingle();
  if (planError || !plan) throw new Error("Plano não encontrado.");

  const existed = Boolean(await findUserIdByEmail(admin, email));
  const userId = await ensureUser(admin, email, input.name);

  const { data: current } = await admin
    .from("subscriptions")
    .select("expires_at, lifetime, status")
    .eq("user_id", userId)
    .maybeSingle();

  // Acesso temporário: nunca diminui o acesso de quem já está com plano ativo
  if (input.minutes) {
    const nowMs = Date.now();
    const endMs = nowMs + Math.round(input.minutes) * 60_000;
    const active = current?.status === "ativa";
    if (active && current?.lifetime) throw new Error("Este cliente já tem acesso vitalício ativo.");
    if (active && current?.expires_at && new Date(current.expires_at).getTime() > endMs) {
      throw new Error(
        `Este cliente já tem acesso ativo até ${new Date(current.expires_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`,
      );
    }
    const temp = new Date(endMs).toISOString();
    const { error: tempError } = await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_id: plan.id,
        status: "ativa",
        lifetime: false,
        expires_at: temp,
        starts_at: new Date(nowMs).toISOString(),
        source: input.source,
        notes: `Acesso temporário de ${Math.round(input.minutes)} min (teste)`,
      },
      { onConflict: "user_id" },
    );
    if (tempError) throw new Error(`Não foi possível liberar o acesso: ${tempError.message}`);
    return { userId, created: !existed, lifetime: false, expiresAt: temp };
  }

  const lifetime = plan.type === "vitalicio" || Boolean(current?.lifetime && current.status === "ativa");
  let expiresAt: string | null = null;
  if (!lifetime) {
    const now = Date.now();
    const currentEnd = current?.expires_at ? new Date(current.expires_at).getTime() : 0;
    const base = current?.status === "ativa" && currentEnd > now ? currentEnd : now;
    expiresAt = new Date(base + (plan.duration_days ?? 30) * 86_400_000).toISOString();
  }

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan_id: plan.id,
      status: "ativa",
      lifetime,
      expires_at: expiresAt,
      starts_at: new Date().toISOString(),
      source: input.source,
      notes: input.notes ?? null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(`Não foi possível liberar o acesso: ${error.message}`);

  return { userId, created: !existed, lifetime, expiresAt };
}

/** Encerra o acesso de um e-mail (reembolso, chargeback, cancelamento). */
export async function revokeAccess(emailRaw: string, reason: string) {
  const email = normalizeEmail(emailRaw);
  const admin = createAdminClient();
  const userId = await findUserIdByEmail(admin, email);
  if (!userId) return { found: false };
  const { error } = await admin
    .from("subscriptions")
    .update({ status: "cancelada", notes: reason })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { found: true };
}

export type LoginCheck =
  | { ok: true; email: string }
  | { ok: false; reason: "invalido" | "nao_encontrado" | "sem_acesso" | "suspenso" | "admin" };

/** Pode entrar só com o e-mail? (precisa ter conta e assinatura ativa) */
export async function findLoginAccount(emailRaw: string): Promise<LoginCheck> {
  const email = normalizeEmail(emailRaw);
  if (!isValidEmail(email)) return { ok: false, reason: "invalido" };
  const admin = createAdminClient();

  const userId = await findUserIdByEmail(admin, email);
  if (!userId) return { ok: false, reason: "nao_encontrado" };

  // Conta de administrador nunca entra só com e-mail
  const { data: adm } = await admin.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (adm) return { ok: false, reason: "admin" };

  const { data: sub } = await admin
    .from("subscriptions")
    .select("status, lifetime, expires_at, plan_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!sub || !sub.plan_id) return { ok: false, reason: "sem_acesso" };
  if (sub.status === "suspensa") return { ok: false, reason: "suspenso" };
  const active =
    sub.status === "ativa" && (sub.lifetime || (sub.expires_at && new Date(sub.expires_at).getTime() > Date.now()));
  if (!active) return { ok: false, reason: "sem_acesso" };

  return { ok: true, email };
}

/** Gera um "passe" de uso único para abrir a sessão sem senha. */
export async function createLoginToken(email: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) {
    throw new Error(`Não foi possível iniciar a sessão: ${error?.message ?? "sem token"}`);
  }
  return data.properties.hashed_token;
}

export async function touchLastSeen(userId: string) {
  const admin = createAdminClient();
  await admin.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", userId);
}
