/**
 * PONTO ÚNICO DE ACESSO AO CATÁLOGO.
 *
 * Fonte dos dados:
 *  - Supabase configurado (.env.local / Vercel) → lê do banco.
 *  - Sem configuração → usa os dados fictícios (para desenvolver o visual).
 *
 * Desempenho: o catálogo publicado é lido UMA vez e guardado em cache
 * (tag "catalog"). Todas as telas usam essa mesma cópia. Quando o painel
 * publicar ou alterar algo (Etapa 6), ele avisa a tag "catalog" e o cache
 * é renovado na hora — o conteúdo aparece para os clientes sem mexer em código.
 * Sem aviso, o cache se renova sozinho a cada 5 minutos.
 */
import { cacheLife, cacheTag } from "next/cache";
import { mockCategories, mockDoramas, mockMyList, mockProgress } from "@/lib/mock/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Category, Dorama, Episode } from "@/types/catalog";

export const CATALOG_TAG = "catalog";

type CatalogData = { doramas: Dorama[]; categories: Category[] };

// ===================================================================
//  Leitura do Supabase
// ===================================================================

type EpisodeRow = {
  id: string;
  number: number;
  title: string;
  synopsis: string;
  duration_min: number;
  thumbnail_url: string | null;
  video_ready: boolean;
};
type DoramaRow = {
  id: string;
  slug: string;
  title: string;
  original_title: string | null;
  tagline: string;
  synopsis: string;
  year: number | null;
  country: string;
  age_rating: Dorama["ageRating"];
  status: Dorama["status"];
  is_featured: boolean;
  featured_position: number;
  is_new: boolean;
  popularity: number;
  art_seed: number;
  poster_url: string | null;
  banner_url: string | null;
  dorama_categories: { categories: { slug: string } | null }[];
  seasons: { number: number; title: string | null; episodes: EpisodeRow[] }[];
};

const DORAMA_SELECT = `
  id, slug, title, original_title, tagline, synopsis, year, country, age_rating, status,
  is_featured, featured_position, is_new, popularity, art_seed, poster_url, banner_url,
  dorama_categories ( categories ( slug ) ),
  seasons ( number, title, episodes ( id, number, title, synopsis, duration_min, thumbnail_url, video_ready ) )
`;

function mapDorama(row: DoramaRow): Dorama {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    originalTitle: row.original_title ?? undefined,
    tagline: row.tagline,
    synopsis: row.synopsis,
    year: row.year ?? new Date().getFullYear(),
    country: row.country,
    ageRating: row.age_rating,
    categories: row.dorama_categories.map((dc) => dc.categories?.slug).filter((s): s is string => Boolean(s)),
    status: row.status,
    isNew: row.is_new,
    isFeatured: row.is_featured,
    featuredPosition: row.featured_position,
    popularity: row.popularity,
    artSeed: row.art_seed,
    posterUrl: row.poster_url ?? undefined,
    bannerUrl: row.banner_url ?? undefined,
    seasons: [...row.seasons]
      .sort((a, b) => a.number - b.number)
      .map((s) => ({
        number: s.number,
        title: s.title ?? undefined,
        episodes: [...s.episodes]
          .sort((a, b) => a.number - b.number)
          .map(
            (e): Episode => ({
              id: e.id,
              doramaSlug: row.slug,
              season: s.number,
              number: e.number,
              title: e.title,
              synopsis: e.synopsis,
              durationMin: e.duration_min,
              thumbnailUrl: e.thumbnail_url ?? undefined,
              available: e.video_ready,
            }),
          ),
      })),
  };
}

async function fetchFromSupabase(): Promise<CatalogData> {
  const { createPublicClient } = await import("@/lib/supabase/public");
  const supabase = createPublicClient();
  const [doramas, categories] = await Promise.all([
    supabase.from("doramas").select(DORAMA_SELECT).eq("visibility", "publicado"),
    supabase.from("categories").select("slug, name, description").order("position"),
  ]);
  if (doramas.error) throw new Error(`Erro ao ler doramas: ${doramas.error.message}`);
  if (categories.error) throw new Error(`Erro ao ler categorias: ${categories.error.message}`);
  return {
    doramas: (doramas.data as unknown as DoramaRow[]).map(mapDorama),
    categories: categories.data.map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description ?? undefined,
    })),
  };
}

/** Catálogo publicado completo, em cache. */
async function getCatalog(): Promise<CatalogData> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife({ stale: 60, revalidate: 300, expire: 86_400 });

  if (!isSupabaseConfigured) return { doramas: mockDoramas, categories: mockCategories };
  return fetchFromSupabase();
}

// ===================================================================
//  Consultas usadas pelas telas
// ===================================================================

const byPopularity = (a: Dorama, b: Dorama) => b.popularity - a.popularity;

export async function getAllDoramas(): Promise<Dorama[]> {
  return [...(await getCatalog()).doramas].sort(byPopularity);
}

export async function getFeaturedDoramas(): Promise<Dorama[]> {
  return (await getCatalog()).doramas
    .filter((d) => d.isFeatured)
    .sort((a, b) => (a.featuredPosition ?? 0) - (b.featuredPosition ?? 0) || byPopularity(a, b));
}

export async function getNewReleases(): Promise<Dorama[]> {
  return (await getCatalog()).doramas
    .filter((d) => d.isNew)
    .sort((a, b) => b.year - a.year || byPopularity(a, b));
}

export async function getTopDoramas(limit = 10): Promise<Dorama[]> {
  return (await getAllDoramas()).slice(0, limit);
}

export async function getDoramasByCategory(slug: string): Promise<Dorama[]> {
  return (await getAllDoramas()).filter((d) => d.categories.includes(slug));
}

export async function getDoramaBySlug(slug: string): Promise<Dorama | undefined> {
  return (await getCatalog()).doramas.find((d) => d.slug === slug);
}

export async function getRelatedDoramas(dorama: Dorama, limit = 8): Promise<Dorama[]> {
  return (await getAllDoramas())
    .filter((d) => d.slug !== dorama.slug)
    .map((d) => ({ d, score: d.categories.filter((c) => dorama.categories.includes(c)).length }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || byPopularity(a.d, b.d))
    .slice(0, limit)
    .map(({ d }) => d);
}

export async function getCategories(): Promise<Category[]> {
  return (await getCatalog()).categories;
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return (await getCatalog()).categories.find((c) => c.slug === slug);
}

/** Nome da categoria a partir do slug (com a lista já carregada). */
export function categoryNameFrom(categories: Category[], slug: string) {
  return categories.find((c) => c.slug === slug)?.name ?? slug;
}

export type EpisodeContext = {
  episode: Episode;
  dorama: Dorama;
  next?: Episode;
  previous?: Episode;
};

export async function getEpisode(id: string): Promise<EpisodeContext | undefined> {
  for (const dorama of (await getCatalog()).doramas) {
    const all = dorama.seasons.flatMap((s) => s.episodes);
    const index = all.findIndex((e) => e.id === id);
    if (index >= 0) {
      const next = all.slice(index + 1).find((e) => e.available);
      return { episode: all[index], dorama, next, previous: all[index - 1] };
    }
  }
}

export async function getAllEpisodeIds(): Promise<string[]> {
  return (await getCatalog()).doramas.flatMap((d) =>
    d.seasons.flatMap((s) => s.episodes.map((e) => e.id)),
  );
}

export function firstEpisode(dorama: Dorama) {
  return dorama.seasons.flatMap((s) => s.episodes).find((e) => e.available);
}

export function episodeCount(dorama: Dorama) {
  return dorama.seasons.reduce((n, s) => n + s.episodes.length, 0);
}

/**
 * Com Cache Components, rotas dinâmicas precisam de pelo menos 1 caminho no build.
 * Se o catálogo estiver vazio (ex.: logo após o lançamento), usamos um caminho
 * "reserva" que simplesmente mostra "não encontrado".
 */
export function withPlaceholder<T extends Record<string, string>>(params: T[], key: keyof T): T[] {
  return params.length > 0 ? params : [{ [key]: "_" } as T];
}

// ===================================================================
//  Dados do usuário logado (Minha Lista, Continuar Assistindo)
//  Dependem de quem está acessando → nunca vão para o cache compartilhado.
//  Use dentro de <Suspense>.
// ===================================================================

async function currentUser() {
  const { createSessionClient } = await import("@/lib/supabase/server");
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export type ContinueItem = EpisodeContext & { percent: number };

export async function getContinueWatching(limit = 12): Promise<ContinueItem[]> {
  if (!isSupabaseConfigured) {
    const items = await Promise.all(
      mockProgress.map(async (p) => {
        const ctx = await getEpisode(p.episodeId);
        return ctx ? { ...ctx, percent: p.percent } : undefined;
      }),
    );
    return items.filter((x): x is ContinueItem => Boolean(x));
  }

  const { supabase, user } = await currentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("watch_progress")
    .select("episode_id, position_sec, duration_sec, completed")
    .eq("completed", false)
    .order("updated_at", { ascending: false })
    .limit(limit * 2);
  if (error || !data) return [];

  const seen = new Set<string>();
  const items: ContinueItem[] = [];
  for (const row of data) {
    const ctx = await getEpisode(row.episode_id);
    // Um card por dorama (o episódio mais recente)
    if (!ctx || seen.has(ctx.dorama.slug)) continue;
    seen.add(ctx.dorama.slug);
    const percent = row.duration_sec > 0 ? Math.round((row.position_sec / row.duration_sec) * 100) : 0;
    items.push({ ...ctx, percent });
    if (items.length >= limit) break;
  }
  return items;
}

export async function getMyList(): Promise<Dorama[]> {
  const catalog = (await getCatalog()).doramas;
  if (!isSupabaseConfigured) {
    return mockMyList.map((s) => catalog.find((d) => d.slug === s)).filter((d): d is Dorama => Boolean(d));
  }

  const { supabase, user } = await currentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("favorites")
    .select("dorama_id")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data
    .map((f) => catalog.find((d) => d.id === f.dorama_id))
    .filter((d): d is Dorama => Boolean(d));
}

export async function isInMyList(dorama: Dorama): Promise<boolean> {
  return (await getMyList()).some((d) => d.slug === dorama.slug);
}
