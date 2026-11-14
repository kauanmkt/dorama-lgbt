"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AdminLoginState = { error?: string; email?: string };

/** LOGIN DO ADMINISTRADOR — e-mail + senha, e só entra se for admin no banco. */
export async function entrarComoAdmin(_prev: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!isSupabaseConfigured) redirect("/admin");
  if (!email || !password) return { error: "Preencha e-mail e senha.", email };

  const { createSessionClient } = await import("@/lib/supabase/server");
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou senha incorretos.", email };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return { error: "Esta conta não tem permissão de administrador.", email };
  }
  redirect("/admin");
}
