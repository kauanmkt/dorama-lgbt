import "server-only";

/**
 * LINK PARA ASSISTIR.
 * Só é chamado depois de conferir que a pessoa tem acesso ativo.
 * O caminho do arquivo no R2 nunca vai para o navegador: a pessoa recebe
 * um link temporário (4 h) que deixa de funcionar sozinho.
 */
import { isR2Configured, presignPlayback } from "@/lib/r2";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type PlaybackSource = { url: string; durationSec?: number };

export async function getPlaybackSource(episodeId: string): Promise<PlaybackSource | null> {
  if (!isSupabaseConfigured || !isR2Configured) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { data } = await createAdminClient()
    .from("videos")
    .select("storage_key, duration_sec")
    .eq("episode_id", episodeId)
    .eq("status", "pronto")
    .maybeSingle();
  if (!data) return null;
  return { url: await presignPlayback(data.storage_key), durationSec: data.duration_sec ?? undefined };
}
