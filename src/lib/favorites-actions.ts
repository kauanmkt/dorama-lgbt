"use server";

import { isSupabaseConfigured } from "@/lib/supabase/config";

/** Adiciona ou remove um dorama da Minha Lista do usuário logado. */
export async function setFavorite(doramaId: string, saved: boolean): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured) return { ok: true }; // modo demonstração
  const { createSessionClient } = await import("@/lib/supabase/server");
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false };

  // O RLS do banco garante que cada um só mexe na própria lista
  const { error } = saved
    ? await supabase.from("favorites").upsert({ user_id: userId, dorama_id: doramaId }, { onConflict: "user_id,dorama_id" })
    : await supabase.from("favorites").delete().eq("user_id", userId).eq("dorama_id", doramaId);
  return { ok: !error };
}
