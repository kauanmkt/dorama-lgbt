/**
 * DADOS FICTÍCIOS DO PAINEL — usados só até a integração com o Supabase (Etapa 4).
 */
import type { AdminUser, Plan, VideoAsset } from "@/types/admin";
import { mockDoramas } from "./catalog";

import { NOW } from "@/lib/format";
const daysFromNow = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toISOString();

export const mockPlans: Plan[] = [
  {
    id: "mensal",
    name: "Mensal",
    description: "Acesso completo, renovado todo mês.",
    priceCents: 1990,
    type: "recorrente",
    durationDays: 30,
    screens: 1,
    active: true,
  },
  {
    id: "trimestral",
    name: "Trimestral",
    description: "Três meses com desconto.",
    priceCents: 4990,
    type: "recorrente",
    durationDays: 90,
    screens: 2,
    active: true,
    highlight: true,
  },
  {
    id: "anual",
    name: "Anual",
    description: "O melhor custo-benefício.",
    priceCents: 15990,
    type: "recorrente",
    durationDays: 365,
    screens: 3,
    active: true,
  },
  {
    id: "vitalicio",
    name: "Vitalício",
    description: "Pague uma vez, assista para sempre.",
    priceCents: 39900,
    type: "vitalicio",
    screens: 2,
    active: true,
  },
  {
    id: "familia",
    name: "Família Mensal",
    description: "Para dividir com quem você ama.",
    priceCents: 3490,
    type: "recorrente",
    durationDays: 30,
    screens: 4,
    active: false,
  },
];

const people = [
  "Lucas Andrade", "Mariana Costa", "Rafael Lima", "Beatriz Souza", "Gabriel Rocha",
  "Juliana Alves", "Pedro Henrique", "Camila Ribeiro", "Thiago Martins", "Larissa Gomes",
  "Felipe Carvalho", "Ana Clara Dias", "Bruno Teixeira", "Isabela Moreira", "Diego Fernandes",
  "Letícia Barbosa", "Vinícius Pereira", "Natália Freitas", "Caio Mendes", "Yasmin Cardoso",
  "Matheus Araújo", "Sofia Nunes", "Enzo Ramos", "Valentina Lopes",
];

const slug = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, ".");

export const mockUsers: AdminUser[] = [
  {
    id: "u0",
    name: "Administrador",
    email: "admin@doramalgbt.com",
    createdAt: daysFromNow(-200),
    lastSeenAt: daysFromNow(0),
    planId: "vitalicio",
    lifetime: true,
    suspended: false,
    extraScreens: 0,
    activeScreens: 1,
    isAdmin: true,
  },
  ...people.map((name, i): AdminUser => {
    const plan = mockPlans[i % 4];
    const lifetime = plan.type === "vitalicio";
    const expired = i % 7 === 3;
    const noPlan = i % 11 === 5;
    return {
      id: `u${i + 1}`,
      name,
      email: `${slug(name)}@email.com`,
      createdAt: daysFromNow(-(i * 6 + 2)),
      lastSeenAt: i % 5 === 4 ? undefined : daysFromNow(-(i % 9)),
      planId: noPlan ? undefined : plan.id,
      expiresAt:
        noPlan || lifetime
          ? undefined
          : daysFromNow(expired ? -(i + 3) : (plan.durationDays ?? 30) - i * 2),
      lifetime: !noPlan && lifetime,
      suspended: i === 9 || i === 17,
      extraScreens: i === 2 ? 1 : 0,
      activeScreens: i % 3,
    };
  }),
];

/** Vídeos no R2: todos os episódios têm vídeo, menos os últimos das séries em exibição */
export const mockVideos: VideoAsset[] = mockDoramas.flatMap((d) =>
  d.seasons.flatMap((s) =>
    s.episodes
      .filter((e) => !(d.status === "em_exibicao" && e.number > s.episodes.length - 2))
      .map((e, i): VideoAsset => ({
        id: `v-${e.id}`,
        episodeId: e.id,
        key: `doramas/${d.slug}/t${s.number}/e${String(e.number).padStart(2, "0")}/video.mp4`,
        fileName: `${d.slug}-t${s.number}e${e.number}.mp4`,
        sizeBytes: Math.round((e.durationMin * 9.5 + (i % 5) * 37) * 1024 * 1024),
        durationSec: e.durationMin * 60,
        format: "mp4",
        status: d.slug === "ultimo-trem" && e.number === 6 ? "processando" : "pronto",
        uploadedAt: daysFromNow(-(Number(d.id) * 3 + e.number)),
      })),
  ),
);
