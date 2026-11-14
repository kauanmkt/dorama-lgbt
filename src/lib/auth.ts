import "server-only";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * QUEM ESTÁ ACESSANDO?
 * Funções usadas pelas telas e ações do servidor para conferir login e permissões.
 * Tudo aqui é verificado no servidor — nunca só na tela.
 * (Sem Supabase configurado, o app roda em modo demonstração, liberado.)
 */

export type SessionUser = { id: string; email: string };

export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isSupabaseConfigured) return { id: "demo", email: "visitante@exemplo.com" };
  const { createSessionClient } = await import("@/lib/supabase/server");
  const supabase = await createSessionClient();
  // getClaims confere a assinatura digital do token de login
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: String(claims.email ?? "") };
}

export async function requireUser(next = "/"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return user;
}

export async function isAdmin(): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  const { createSessionClient } = await import("@/lib/supabase/server");
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}

/** Garante que é o administrador; caso contrário, manda para o login do painel. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/entrar");
  if (!(await isAdmin())) redirect("/admin/entrar?erro=sem-permissao");
  return user;
}

export type MyAccess = {
  hasAccess: boolean;
  planName?: string;
  planType?: "recorrente" | "vitalicio";
  screens: number;
  lifetime: boolean;
  expiresAt?: string;
  status?: "ativa" | "suspensa" | "cancelada";
};

/** Situação do acesso da pessoa logada (plano, validade, telas). */
export async function getMyAccess(): Promise<MyAccess> {
  if (!isSupabaseConfigured) {
    return { hasAccess: true, planName: "Premium (demonstração)", planType: "recorrente", screens: 2, lifetime: false, expiresAt: "2026-12-14T12:00:00-03:00", status: "ativa" };
  }
  const { createSessionClient } = await import("@/lib/supabase/server");
  const supabase = await createSessionClient();
  const { data } = await supabase.rpc("my_access");
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { hasAccess: false, screens: 0, lifetime: false };
  return {
    hasAccess: Boolean(row.has_access),
    planName: row.plan_name ?? undefined,
    planType: row.plan_type ?? undefined,
    screens: row.screens ?? 0,
    lifetime: Boolean(row.lifetime),
    expiresAt: row.expires_at ?? undefined,
    status: row.status ?? undefined,
  };
}

export type MyProfile = { name: string; email: string };

export async function getMyProfile(): Promise<MyProfile | null> {
  if (!isSupabaseConfigured) return { name: "Visitante", email: "visitante@exemplo.com" };
  const user = await getSessionUser();
  if (!user) return null;
  const { createSessionClient } = await import("@/lib/supabase/server");
  const supabase = await createSessionClient();
  const { data } = await supabase.from("profiles").select("name, email").eq("id", user.id).maybeSingle();
  return { name: data?.name || user.email.split("@")[0], email: data?.email ?? user.email };
}
