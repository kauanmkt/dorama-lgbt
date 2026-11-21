import { cacheLife, cacheTag } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const SETTINGS_TAG = "settings";

/** Configurações públicas da plataforma (tabela settings), em cache. */
async function getPublicSettings(): Promise<Record<string, unknown>> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  // Mudanças no catálogo já limpam o cache na hora (tags); a renovação automática é só de segurança
  cacheLife({ stale: 300, revalidate: 3600, expire: 86_400 });
  if (!isSupabaseConfigured) return {};

  const { createPublicClient } = await import("@/lib/supabase/public");
  const { data, error } = await createPublicClient().from("settings").select("key, value");
  if (error || !data) return {};
  return Object.fromEntries(data.map((r) => [r.key, r.value]));
}

export async function getPublicSetting<T>(key: string): Promise<T | undefined> {
  return (await getPublicSettings())[key] as T | undefined;
}
