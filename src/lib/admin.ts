/**
 * PONTO ÚNICO DE ACESSO AOS DADOS DO PAINEL.
 * Hoje lê os dados fictícios; na Etapa 4 passa a consultar o Supabase
 * (sempre verificando no servidor se quem pede é administrador).
 */
import { mockCategories, mockDoramas } from "@/lib/mock/catalog";
import { NOW } from "@/lib/format";
import { mockPlans, mockUsers, mockVideos } from "@/lib/mock/admin";
import { accessStatus } from "@/lib/format";
import type { AdminDorama, AdminUser, Plan, VideoAsset } from "@/types/admin";
import type { Category } from "@/types/catalog";

const drafts: AdminDorama[] = [
  {
    id: "100",
    slug: "estrelas-de-papel",
    title: "Estrelas de Papel",
    tagline: "Mil estrelas dobradas. Um único desejo.",
    synopsis: "Rascunho — sinopse ainda em revisão.",
    year: 2026,
    country: "Coreia do Sul",
    ageRating: "12",
    categories: ["bl", "romance"],
    status: "em_exibicao",
    popularity: 0,
    artSeed: 14,
    seasons: [{ number: 1, episodes: [] }],
    visibility: "rascunho",
    updatedAt: new Date(NOW.getTime() - 3_600_000).toISOString(),
  },
  {
    id: "101",
    slug: "mare-alta",
    title: "Maré Alta",
    tagline: "",
    synopsis: "",
    year: 2026,
    country: "Tailândia",
    ageRating: "14",
    categories: ["gl"],
    status: "em_exibicao",
    popularity: 0,
    artSeed: 15,
    seasons: [],
    visibility: "rascunho",
    updatedAt: new Date(NOW.getTime() - 86_400_000 * 2).toISOString(),
  },
];

export async function getAdminDoramas(): Promise<AdminDorama[]> {
  const published = mockDoramas.map(
    (d, i): AdminDorama => ({
      ...d,
      visibility: "publicado",
      updatedAt: new Date(NOW.getTime() - 86_400_000 * (i * 2 + 1)).toISOString(),
    }),
  );
  return [...drafts, ...published];
}

export async function getAdminDorama(slug: string) {
  return (await getAdminDoramas()).find((d) => d.slug === slug);
}

export async function getAdminCategories(): Promise<(Category & { count: number })[]> {
  const all = await getAdminDoramas();
  return mockCategories.map((c) => ({
    ...c,
    count: all.filter((d) => d.categories.includes(c.slug)).length,
  }));
}

export async function getPlans(): Promise<Plan[]> {
  return mockPlans;
}

export async function getUsers(): Promise<AdminUser[]> {
  return mockUsers;
}

export async function getVideos(): Promise<VideoAsset[]> {
  return mockVideos;
}

export async function getDashboardStats() {
  const [doramas, users, videos] = await Promise.all([getAdminDoramas(), getUsers(), getVideos()]);
  const episodes = doramas.flatMap((d) => d.seasons.flatMap((s) => s.episodes));
  const since = NOW.getTime() - 30 * 86_400_000;
  return {
    users: users.length,
    activeUsers: users.filter((u) => accessStatus(u) === "ativo").length,
    newUsers: users.filter((u) => new Date(u.createdAt).getTime() >= since).length,
    doramas: doramas.length,
    published: doramas.filter((d) => d.visibility === "publicado").length,
    drafts: doramas.filter((d) => d.visibility === "rascunho").length,
    episodes: episodes.length,
    episodesWithoutVideo: episodes.filter((e) => !videos.some((v) => v.episodeId === e.id)).length,
    storageBytes: videos.reduce((n, v) => n + v.sizeBytes, 0),
    expiringSoon: users.filter((u) => {
      if (!u.expiresAt || u.lifetime) return false;
      const t = new Date(u.expiresAt).getTime();
      return t >= NOW.getTime() && t <= NOW.getTime() + 7 * 86_400_000;
    }).length,
  };
}
