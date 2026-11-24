/**
 * Formatos de dados usados só no painel administrativo.
 * Na Etapa 4 viram tabelas no Supabase.
 */
import type { Dorama } from "./catalog";

export type Visibility = "publicado" | "rascunho";

/** Dorama como o admin vê: inclui rascunhos e data de atualização */
export type AdminDorama = Dorama & {
  visibility: Visibility;
  updatedAt: string; // ISO
};

export type PlanType = "recorrente" | "vitalicio";

export type Plan = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  type: PlanType;
  /** Duração em dias (vazio para vitalício) */
  durationDays?: number;
  screens: number;
  active: boolean;
  highlight?: boolean;
  /** IDs dos produtos na Lowify que liberam este plano */
  productIds?: string[];
  /** Link do checkout (botão na janela de planos do site) */
  checkoutUrl?: string;
  /** Aparece na janela de planos para quem ainda não assina */
  showOnSite?: boolean;
};

export type AccessStatus = "ativo" | "expirado" | "suspenso" | "sem_plano";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string; // ISO
  lastSeenAt?: string; // ISO
  planId?: string;
  /** Data de expiração (vazio = vitalício ou sem plano) */
  expiresAt?: string;
  lifetime: boolean;
  suspended: boolean;
  /** Assinatura encerrada (reembolso, cancelamento) */
  cancelled?: boolean;
  /** Telas extras além das do plano */
  extraScreens: number;
  /** Comprou o "Assista na televisão" */
  tvAccess: boolean;
  /** Só na criação: acesso temporário (teste) de N minutos */
  tempMinutes?: number;
  activeScreens: number;
  isAdmin?: boolean;
};

export type VideoStatus = "pronto" | "enviando" | "processando" | "erro";

export type VideoAsset = {
  id: string;
  episodeId: string;
  /** Caminho no Cloudflare R2 */
  key: string;
  fileName: string;
  sizeBytes: number;
  durationSec?: number;
  format: "mp4" | "hls";
  status: VideoStatus;
  uploadedAt: string; // ISO
};
