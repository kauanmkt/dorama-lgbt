"use server";

import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Salva onde a pessoa parou no episódio (chamado pelo player a cada ~15 s,
 * ao pausar e ao sair). Com 90% assistido o episódio conta como concluído e
 * sai do "Continuar assistindo".
 */
export async function salvarProgresso(input: {
  episodeId: string;
  positionSec: number;
  durationSec: number;
}): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured) return { ok: true };
  const position = Math.max(0, Math.floor(input.positionSec));
  const duration = Math.max(0, Math.floor(input.durationSec));
  if (!/^[0-9a-f-]{36}$/.test(input.episodeId) || duration === 0) return { ok: false };

  const { createSessionClient } = await import("@/lib/supabase/server");
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false };

  // O RLS garante que cada pessoa só grava o próprio progresso
  const { error } = await supabase.from("watch_progress").upsert(
    {
      user_id: userId,
      episode_id: input.episodeId,
      position_sec: Math.min(position, duration),
      duration_sec: duration,
      completed: position >= duration * 0.9,
    },
    { onConflict: "user_id,episode_id" },
  );
  return { ok: !error };
}
