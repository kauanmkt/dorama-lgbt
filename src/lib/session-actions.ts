"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Sair da conta (cliente ou admin). */
export async function sair(formData: FormData) {
  const to = formData.get("para") === "admin" ? "/admin/entrar" : "/entrar";
  if (isSupabaseConfigured) {
    const { createSessionClient } = await import("@/lib/supabase/server");
    const supabase = await createSessionClient();
    await supabase.auth.signOut();
  }
  redirect(to);
}
