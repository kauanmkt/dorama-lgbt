"use server";

import { redirect } from "next/navigation";
import { safeNext } from "@/lib/redirects";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type LoginState = { error?: string; email?: string };

/**
 * ENTRAR SÓ COM O E-MAIL (cliente)
 * 1. Confere no servidor se o e-mail tem conta e assinatura ativa.
 * 2. Gera um passe de uso único e abre a sessão (cookies seguros).
 * Contas de administrador não entram por aqui — só com senha, em /admin/entrar.
 */
export async function entrarComEmail(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const next = safeNext(formData.get("next"));

  if (!isSupabaseConfigured) redirect(next); // modo demonstração

  const { findLoginAccount, createLoginToken, touchLastSeen } = await import("@/lib/access");
  const { createSessionClient } = await import("@/lib/supabase/server");

  let userId: string | undefined;
  try {
    const check = await findLoginAccount(email);
    if (!check.ok) {
      if (check.reason === "invalido") return { error: "Digite um e-mail válido.", email };
      if (check.reason === "suspenso")
        return { error: "Seu acesso está suspenso. Fale com o suporte.", email };
      // Mesma mensagem para "não existe", "sem plano" e "admin": não revela quem é cliente
      return { error: "Não encontramos uma assinatura ativa para este e-mail.", email };
    }

    const tokenHash = await createLoginToken(check.email);
    const supabase = await createSessionClient();
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    if (error || !data.user) return { error: "Não foi possível entrar agora. Tente novamente.", email };
    userId = data.user.id;
  } catch (e) {
    console.error("[login]", e);
    return { error: "Não foi possível entrar agora. Tente novamente em instantes.", email };
  }

  await touchLastSeen(userId).catch(() => {});
  redirect(next);
}
