"use server";

/**
 * AÇÕES DE CONTEÚDO DO PAINEL (doramas, categorias, configurações).
 *
 * Toda ação:
 *  1. confere no servidor se quem pede é admin (e o banco confere de novo, pelo RLS);
 *  2. salva no Supabase;
 *  3. avisa o cache do site ("catalog"/"settings") — o cliente vê a mudança na hora.
 */
import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { SETTINGS_TAG } from "@/lib/settings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Visibility } from "@/types/admin";
import type { Dorama } from "@/types/catalog";

type Result = { ok: true; message?: string } | { ok: false; error: string };

const demo = (): Result => ({ ok: true, message: "Modo demonstração: nada foi salvo." });

async function session() {
  await requireAdmin();
  const { createSessionClient } = await import("@/lib/supabase/server");
  return createSessionClient();
}

type Db = Awaited<ReturnType<typeof session>>;

/** Arquivos de vídeo (no R2) dos episódios de um dorama. */
async function videoKeys(supabase: Db, doramaId: string): Promise<string[]> {
  const { data } = await supabase
    .from("videos")
    .select("storage_key, episodes!inner(seasons!inner(dorama_id))")
    .eq("episodes.seasons.dorama_id", doramaId);
  return (data ?? []).map((v) => v.storage_key as string);
}

/** Apaga do R2 os vídeos que deixaram de existir no banco. */
async function cleanupVideos(keys: string[]) {
  if (keys.length === 0) return;
  const { deleteObjectsQuietly } = await import("@/lib/r2");
  await deleteObjectsQuietly(keys);
}

/** Traduz os erros do banco para algo que dá para entender. */
function friendly(message: string): string {
  if (message.includes("doramas_slug_key")) return "Já existe um dorama com esse endereço. Troque o endereço da página.";
  if (message.includes("episodes_season_id_number_key")) return "Há dois episódios com o mesmo número na mesma temporada.";
  if (message.includes("categories_slug_key")) return "Já existe uma categoria com esse nome.";
  if (message.includes("doramas_slug_check")) return "Endereço inválido: use só letras minúsculas, números e hífens.";
  if (message.includes("42501") || message.toLowerCase().includes("administradores")) return "Sem permissão. Entre de novo no painel.";
  return message;
}

// ===================================================================
//  Doramas
// ===================================================================

export type DoramaInput = {
  id?: string;
  slug: string;
  title: string;
  originalTitle?: string;
  tagline: string;
  synopsis: string;
  year: number;
  country: string;
  ageRating: Dorama["ageRating"];
  status: Dorama["status"];
  visibility: Visibility;
  isFeatured: boolean;
  isNew: boolean;
  artSeed: number;
  posterUrl?: string;
  bannerUrl?: string;
  categories: string[];
  /** O vídeo único do dorama (guardado internamente como "episódio 1") */
  video: { episodeId?: string; durationMin: number };
};

export async function salvarDorama(input: DoramaInput): Promise<Result & { id?: string; slug?: string }> {
  if (!isSupabaseConfigured) return { ...demo(), slug: input.slug };
  if (!input.title.trim()) return { ok: false, error: "O título é obrigatório." };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug) || input.slug === "novo") {
    return { ok: false, error: "Endereço inválido: use só letras minúsculas, números e hífens." };
  }

  const supabase = await session();
  const before = input.id ? await videoKeys(supabase, input.id) : [];
  const { data, error } = await supabase.rpc("admin_save_dorama", {
    payload: {
      id: input.id ?? null,
      slug: input.slug,
      title: input.title.trim().slice(0, 120),
      original_title: input.originalTitle?.trim() ?? "",
      tagline: input.tagline.trim().slice(0, 90),
      synopsis: input.synopsis.trim(),
      year: Number.isFinite(input.year) ? Math.min(2100, Math.max(1950, Math.round(input.year))) : null,
      country: input.country,
      age_rating: input.ageRating,
      status: input.status,
      visibility: input.visibility,
      is_featured: input.isFeatured,
      is_new: input.isNew,
      art_seed: input.artSeed,
      poster_url: input.posterUrl ?? "",
      banner_url: input.bannerUrl ?? "",
      categories: input.categories,
      seasons: [
        {
          number: 1,
          episodes: [
            {
              id: input.video.episodeId ?? null,
              number: 1,
              title: input.title.trim().slice(0, 120),
              synopsis: "",
              duration_min: Math.max(0, Math.round(input.video.durationMin || 0)),
            },
          ],
        },
      ],
    },
  });
  if (error) return { ok: false, error: friendly(error.message) };

  updateTag(CATALOG_TAG);
  const saved = data as { id: string; slug: string };
  // Episódios/temporadas excluídos levam junto o vídeo: apaga o arquivo do R2
  if (before.length) {
    const after = new Set(await videoKeys(supabase, saved.id));
    await cleanupVideos(before.filter((k) => !after.has(k)));
  }
  return { ok: true, id: saved.id, slug: saved.slug };
}

export async function excluirDorama(id: string): Promise<Result> {
  if (!isSupabaseConfigured) return demo();
  const supabase = await session();
  const keys = await videoKeys(supabase, id);
  const { error } = await supabase.from("doramas").delete().eq("id", id);
  if (error) return { ok: false, error: friendly(error.message) };
  updateTag(CATALOG_TAG);
  await cleanupVideos(keys);
  return { ok: true };
}

export async function alterarVisibilidade(id: string, visibility: Visibility): Promise<Result> {
  if (!isSupabaseConfigured) return demo();
  const supabase = await session();
  const { error } = await supabase.from("doramas").update({ visibility }).eq("id", id);
  if (error) return { ok: false, error: friendly(error.message) };
  updateTag(CATALOG_TAG);
  return { ok: true };
}

export async function alterarDestaque(id: string, featured: boolean): Promise<Result> {
  if (!isSupabaseConfigured) return demo();
  const supabase = await session();
  let position = 0;
  if (featured) {
    const { data } = await supabase
      .from("doramas")
      .select("featured_position")
      .eq("is_featured", true)
      .order("featured_position", { ascending: false })
      .limit(1);
    position = (data?.[0]?.featured_position ?? 0) + 1;
  }
  const { error } = await supabase
    .from("doramas")
    .update({ is_featured: featured, featured_position: position })
    .eq("id", id);
  if (error) return { ok: false, error: friendly(error.message) };
  updateTag(CATALOG_TAG);
  return { ok: true };
}

// ===================================================================
//  Categorias
// ===================================================================

export async function salvarCategoria(input: {
  slug: string;
  name: string;
  description?: string;
  isNew: boolean;
}): Promise<Result> {
  if (!isSupabaseConfigured) return demo();
  if (!input.name.trim()) return { ok: false, error: "Dê um nome à categoria." };
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug)) return { ok: false, error: "Nome inválido para endereço." };
  const supabase = await session();
  const row = { name: input.name.trim().slice(0, 60), description: input.description?.trim() || null };

  let error;
  if (input.isNew) {
    const { data: last } = await supabase
      .from("categories")
      .select("position")
      .order("position", { ascending: false })
      .limit(1);
    ({ error } = await supabase
      .from("categories")
      .insert({ ...row, slug: input.slug, position: (last?.[0]?.position ?? 0) + 1 }));
  } else {
    ({ error } = await supabase.from("categories").update(row).eq("slug", input.slug));
  }
  if (error) return { ok: false, error: friendly(error.message) };
  updateTag(CATALOG_TAG);
  return { ok: true };
}

export async function excluirCategoria(slug: string): Promise<Result> {
  if (!isSupabaseConfigured) return demo();
  const supabase = await session();
  const { error } = await supabase.from("categories").delete().eq("slug", slug);
  if (error) return { ok: false, error: friendly(error.message) };
  updateTag(CATALOG_TAG);
  return { ok: true };
}

export async function ordenarCategorias(slugs: string[]): Promise<Result> {
  if (!isSupabaseConfigured) return demo();
  const supabase = await session();
  const { error } = await supabase.rpc("admin_reorder_categories", { slugs });
  if (error) return { ok: false, error: friendly(error.message) };
  updateTag(CATALOG_TAG);
  return { ok: true };
}

// ===================================================================
//  Configurações
// ===================================================================

export type SettingsInput = {
  platformName: string;
  supportEmail: string;
  announcement: string;
  purchaseUrl: string;
  /** Link de checkout do upgrade de telas (página "Telas conectadas") */
  upgradeUrl: string;
  maintenance: boolean;
  autoplayNext: boolean;
  heroRotation: number;
  /** IDs da Lowify do produto "tela extra" (order bump) */
  extraScreenIds: string[];
  /** ids dos doramas em destaque, na ordem do banner */
  featuredIds: string[];
};

export async function salvarConfiguracoes(input: SettingsInput): Promise<Result> {
  if (!isSupabaseConfigured) return demo();
  const url = input.purchaseUrl.trim();
  if (url && !/^https?:\/\/\S+$/i.test(url)) {
    return { ok: false, error: "O link de compra precisa começar com https://" };
  }
  const upgradeUrl = input.upgradeUrl.trim();
  if (upgradeUrl && !/^https?:\/\/\S+$/i.test(upgradeUrl)) {
    return { ok: false, error: "O link do upgrade de telas precisa começar com https://" };
  }
  const supabase = await session();
  const rows = [
    { key: "platform_name", value: input.platformName.trim() || "Amora Dramas" },
    { key: "support_email", value: input.supportEmail.trim() },
    { key: "announcement", value: input.announcement.trim().slice(0, 160) },
    { key: "purchase_url", value: url },
    { key: "upgrade_url", value: upgradeUrl },
    { key: "maintenance", value: input.maintenance },
    { key: "autoplay_next", value: input.autoplayNext },
    { key: "hero_rotation_s", value: [0, 6, 8, 12].includes(input.heroRotation) ? input.heroRotation : 8 },
  ].map((r) => ({ ...r, is_public: true }));

  const extraIds = [...new Set(input.extraScreenIds.map((x) => x.trim()).filter(Boolean))].slice(0, 20);
  const [settings, featured] = await Promise.all([
    supabase.from("settings").upsert(
      [...rows, { key: "extra_screen_product_ids", value: extraIds, is_public: false }],
      { onConflict: "key" },
    ),
    supabase.rpc("admin_set_featured", { ids: input.featuredIds }),
  ]);
  const error = settings.error ?? featured.error;
  if (error) return { ok: false, error: friendly(error.message) };

  updateTag(SETTINGS_TAG);
  updateTag(CATALOG_TAG);
  return { ok: true, message: "Configurações salvas" };
}
