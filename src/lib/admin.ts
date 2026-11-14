/**
 * PONTO ÚNICO DE ACESSO AOS DADOS DO PAINEL.
 * Hoje lê os dados fictícios; na Etapa 4 passa a consultar o Supabase
 * (sempre verificando no servidor se quem pede é administrador).
 */
import { mockCategories, mockDoramas } from "@/lib/mock/catalog";
import { NOW } from "@/lib/format";
import { mockPlans, mockUsers, mockVideos } from "@/lib/mock/admin";
import { requireAdmin } from "@/lib/auth";
import { accessStatus } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";
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

// ===== Planos e usuários: já leem do banco quando o Supabase está configurado =====

type PlanRow = {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  type: Plan["type"];
  duration_days: number | null;
  screens: number;
  active: boolean;
  highlight: boolean;
};

export async function getPlans(): Promise<Plan[]> {
  if (!isSupabaseConfigured) return mockPlans;
  await requireAdmin();
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("plans")
    .select("id, name, description, price_cents, type, duration_days, screens, active, highlight")
    .order("position")
    .order("created_at");
  if (error) throw new Error(`Erro ao ler planos: ${error.message}`);
  return (data as PlanRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    priceCents: p.price_cents,
    type: p.type,
    durationDays: p.duration_days ?? undefined,
    screens: p.screens,
    active: p.active,
    highlight: p.highlight,
  }));
}

/** Uma tela conta como "em uso" se deu sinal de vida nos últimos 2 minutos. */
const SCREEN_TIMEOUT_MS = 2 * 60 * 1000;

export async function getUsers(): Promise<AdminUser[]> {
  if (!isSupabaseConfigured) return mockUsers;
  await requireAdmin();
  const supabase = await createSessionClient();
  const since = new Date(Date.now() - SCREEN_TIMEOUT_MS).toISOString();
  const [profiles, subs, admins, sessions] = await Promise.all([
    supabase.from("profiles").select("id, name, email, created_at, last_seen_at").order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("user_id, plan_id, status, lifetime, expires_at, extra_screens"),
    supabase.from("admins").select("user_id"),
    supabase.from("playback_sessions").select("user_id").gte("last_heartbeat_at", since),
  ]);
  if (profiles.error) throw new Error(`Erro ao ler usuários: ${profiles.error.message}`);

  const subByUser = new Map((subs.data ?? []).map((s) => [s.user_id, s]));
  const adminIds = new Set((admins.data ?? []).map((a) => a.user_id));
  const screens = new Map<string, number>();
  (sessions.data ?? []).forEach((s) => screens.set(s.user_id, (screens.get(s.user_id) ?? 0) + 1));

  return profiles.data.map((p): AdminUser => {
    const sub = subByUser.get(p.id);
    return {
      id: p.id,
      name: p.name || p.email.split("@")[0],
      email: p.email,
      createdAt: p.created_at,
      lastSeenAt: p.last_seen_at ?? undefined,
      planId: sub?.plan_id ?? undefined,
      expiresAt: sub?.expires_at ?? undefined,
      lifetime: Boolean(sub?.lifetime),
      suspended: sub?.status === "suspensa",
      cancelled: sub?.status === "cancelada",
      extraScreens: sub?.extra_screens ?? 0,
      activeScreens: screens.get(p.id) ?? 0,
      isAdmin: adminIds.has(p.id),
    };
  });
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
