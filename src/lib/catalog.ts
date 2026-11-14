/**
 * PONTO ÚNICO DE ACESSO AO CATÁLOGO.
 * Hoje lê os dados fictícios; na Etapa 4 estas mesmas funções passam a
 * consultar o Supabase. Nenhuma tela precisa ser alterada.
 */
import { mockCategories, mockDoramas, mockMyList, mockProgress } from "@/lib/mock/catalog";
import type { Category, Dorama, Episode } from "@/types/catalog";

const published = () => mockDoramas;

export async function getAllDoramas(): Promise<Dorama[]> {
  return [...published()].sort((a, b) => b.popularity - a.popularity);
}

export async function getFeaturedDoramas(): Promise<Dorama[]> {
  return published().filter((d) => d.isFeatured);
}

export async function getNewReleases(): Promise<Dorama[]> {
  return published()
    .filter((d) => d.isNew)
    .sort((a, b) => b.year - a.year || b.popularity - a.popularity);
}

export async function getTopDoramas(limit = 10): Promise<Dorama[]> {
  return (await getAllDoramas()).slice(0, limit);
}

export async function getDoramasByCategory(slug: string): Promise<Dorama[]> {
  return (await getAllDoramas()).filter((d) => d.categories.includes(slug));
}

export async function getDoramaBySlug(slug: string): Promise<Dorama | undefined> {
  return published().find((d) => d.slug === slug);
}

export async function getRelatedDoramas(dorama: Dorama, limit = 8): Promise<Dorama[]> {
  return (await getAllDoramas())
    .filter((d) => d.slug !== dorama.slug)
    .map((d) => ({ d, score: d.categories.filter((c) => dorama.categories.includes(c)).length }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.d.popularity - a.d.popularity)
    .slice(0, limit)
    .map(({ d }) => d);
}

export async function getCategories(): Promise<Category[]> {
  return mockCategories;
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return mockCategories.find((c) => c.slug === slug);
}

export function categoryName(slug: string) {
  return mockCategories.find((c) => c.slug === slug)?.name ?? slug;
}

export type EpisodeContext = {
  episode: Episode;
  dorama: Dorama;
  next?: Episode;
  previous?: Episode;
};

export async function getEpisode(id: string): Promise<EpisodeContext | undefined> {
  for (const dorama of published()) {
    const all = dorama.seasons.flatMap((s) => s.episodes);
    const index = all.findIndex((e) => e.id === id);
    if (index >= 0) {
      return { episode: all[index], dorama, next: all[index + 1], previous: all[index - 1] };
    }
  }
}

export async function getAllEpisodeIds(): Promise<string[]> {
  return published().flatMap((d) => d.seasons.flatMap((s) => s.episodes.map((e) => e.id)));
}

export function firstEpisode(dorama: Dorama) {
  return dorama.seasons[0]?.episodes[0];
}

export function episodeCount(dorama: Dorama) {
  return dorama.seasons.reduce((n, s) => n + s.episodes.length, 0);
}

// ===== Dados do usuário (virão do Supabase, por usuário logado) =====

export async function getContinueWatching() {
  const items = await Promise.all(
    mockProgress.map(async (p) => {
      const ctx = await getEpisode(p.episodeId);
      return ctx ? { ...ctx, percent: p.percent } : undefined;
    }),
  );
  return items.filter((x): x is NonNullable<typeof x> => Boolean(x));
}

export async function getMyList(): Promise<Dorama[]> {
  return mockMyList
    .map((slug) => published().find((d) => d.slug === slug))
    .filter((d): d is Dorama => Boolean(d));
}

export async function isInMyList(slug: string) {
  return mockMyList.includes(slug);
}
