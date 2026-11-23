/**
 * PONTO ÚNICO DE ACESSO AOS DADOS DO PAINEL.
 * Com o Supabase configurado, tudo vem do banco — sempre conferindo no
 * servidor se quem pede é administrador. Sem configuração, usa os dados
 * fictícios (para desenvolver o visual).
 */
import { mockCategories, mockDoramas } from "@/lib/mock/catalog";
import { NOW } from "@/lib/format";
import { mockPlans, mockUsers, mockVideos } from "@/lib/mock/admin";
import { requireAdmin } from "@/lib/auth";
import { accessStatus } from "@/lib/format";
import { DORAMA_SELECT, mapDorama, type DoramaRow } from "@/lib/catalog";
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

async function adminClient() {
  await requireAdmin();
  return createSessionClient();
}

type AdminDoramaRow = DoramaRow & { visibility: AdminDorama["visibility"]; updated_at: string };

/** Todos os doramas (publicados e rascunhos), do mais recente para o mais antigo. */
export async function getAdminDoramas(): Promise<AdminDorama[]> {
  if (!isSupabaseConfigured) {
    const published = mockDoramas.map(
      (d, i): AdminDorama => ({
        ...d,
        visibility: "publicado",
        updatedAt: new Date(NOW.getTime() - 86_400_000 * (i * 2 + 1)).toISOString(),
      }),
    );
    return [...drafts, ...published];
  }
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("doramas")
    .select(`${DORAMA_SELECT}, visibility, updated_at`)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Erro ao ler doramas: ${error.message}`);
  return (data as unknown as AdminDoramaRow[]).map((row) => ({
    ...mapDorama(row),
    visibility: row.visibility,
    updatedAt: row.updated_at,
  }));
}

export async function getAdminDorama(slug: string): Promise<AdminDorama | undefined> {
  if (!isSupabaseConfigured) return (await getAdminDoramas()).find((d) => d.slug === slug);
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("doramas")
    .select(`${DORAMA_SELECT}, visibility, updated_at`)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Erro ao ler dorama: ${error.message}`);
  if (!data) return undefined;
  const row = data as unknown as AdminDoramaRow;
  return { ...mapDorama(row), visibility: row.visibility, updatedAt: row.updated_at };
}

export type AdminCategory = Category & { count: number };

/** Categorias na ordem das fileiras, com quantos doramas usam cada uma. */
export async function getAdminCategories(): Promise<AdminCategory[]> {
  if (!isSupabaseConfigured) {
    const all = await getAdminDoramas();
    return mockCategories.map((c) => ({
      ...c,
      count: all.filter((d) => d.categories.includes(c.slug)).length,
    }));
  }
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("slug, name, description, dorama_categories(count)")
    .order("position")
    .order("name");
  if (error) throw new Error(`Erro ao ler categorias: ${error.message}`);
  return data.map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description ?? undefined,
    count: (c.dorama_categories as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

/** Todas as configurações (inclusive as não públicas), como objeto chave → valor. */
export async function getAdminSettings(): Promise<Record<string, unknown>> {
  if (!isSupabaseConfigured) return {};
  const supabase = await adminClient();
  const { data, error } = await supabase.from("settings").select("key, value");
  if (error) throw new Error(`Erro ao ler configurações: ${error.message}`);
  return Object.fromEntries(data.map((r) => [r.key, r.value]));
}

// ===== Planos e usuários: já leem do banco quando o Supabase está configurado =====

type PlanRow = {
  external_product_ids?: string[];
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
    .select("id, name, description, price_cents, type, duration_days, screens, active, highlight, external_product_ids")
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
    productIds: p.external_product_ids ?? [],
  }));
}

/** Uma tela conta como "em uso" se deu sinal de vida nos últimos 2 minutos. */
const SCREEN_TIMEOUT_MS = 4 * 60 * 1000; // o player avisa a cada 90 s

export async function getUsers(): Promise<AdminUser[]> {
  if (!isSupabaseConfigured) return mockUsers;
  await requireAdmin();
  const supabase = await createSessionClient();
  const since = new Date(Date.now() - SCREEN_TIMEOUT_MS).toISOString();
  const [profiles, subs, admins, sessions] = await Promise.all([
    supabase.from("profiles").select("id, name, email, created_at, last_seen_at").order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("user_id, plan_id, status, lifetime, expires_at, extra_screens, tv_access"),
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
      tvAccess: Boolean(sub?.tv_access),
      activeScreens: screens.get(p.id) ?? 0,
      isAdmin: adminIds.has(p.id),
    };
  });
}

type VideoRow = {
  id: string;
  episode_id: string;
  storage_key: string;
  file_name: string;
  size_bytes: number;
  duration_sec: number | null;
  format: VideoAsset["format"];
  status: VideoAsset["status"];
  uploaded_at: string | null;
  created_at: string;
};

export async function getVideos(): Promise<VideoAsset[]> {
  if (!isSupabaseConfigured) return mockVideos;
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("videos")
    .select("id, episode_id, storage_key, file_name, size_bytes, duration_sec, format, status, uploaded_at, created_at");
  if (error) throw new Error(`Erro ao ler vídeos: ${error.message}`);
  return (data as VideoRow[]).map((v) => ({
    id: v.id,
    episodeId: v.episode_id,
    key: v.storage_key,
    fileName: v.file_name,
    sizeBytes: Number(v.size_bytes),
    durationSec: v.duration_sec ?? undefined,
    format: v.format,
    status: v.status,
    uploadedAt: v.uploaded_at ?? v.created_at,
  }));
}

export async function getDashboardStats(now: number) {
  const [doramas, users, videos] = await Promise.all([getAdminDoramas(), getUsers(), getVideos()]);
  // Um vídeo por dorama: conta os doramas cujo vídeo ainda não foi enviado
  const withoutVideo = doramas.filter((d) => {
    const e = d.seasons[0]?.episodes[0];
    return !e || (!e.available && !videos.some((v) => v.episodeId === e.id));
  });
  const since = now - 30 * 86_400_000;
  return {
    users: users.length,
    activeUsers: users.filter((u) => accessStatus(u, new Date(now)) === "ativo").length,
    newUsers: users.filter((u) => new Date(u.createdAt).getTime() >= since).length,
    doramas: doramas.length,
    published: doramas.filter((d) => d.visibility === "publicado").length,
    drafts: doramas.filter((d) => d.visibility === "rascunho").length,
    videos: doramas.length - withoutVideo.length,
    withoutVideo: withoutVideo.length,
    storageBytes: videos.reduce((n, v) => n + v.sizeBytes, 0),
    expiringSoon: users.filter((u) => {
      if (!u.expiresAt || u.lifetime) return false;
      const t = new Date(u.expiresAt).getTime();
      return t >= now && t <= now + 7 * 86_400_000;
    }).length,
  };
}
