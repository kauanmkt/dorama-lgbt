/**
 * Regras simples e formatação de valores (datas, dinheiro, tamanhos).
 * Pode ser usado tanto no servidor quanto na tela do navegador.
 */
import type { AccessStatus, AdminUser } from "@/types/admin";

/**
 * "Hoje" do sistema. Fixo durante a fase de dados fictícios para a prévia
 * ficar estável; na Etapa 4 vira a data real.
 */
export const NOW = new Date("2026-11-14T12:00:00-03:00");


export function accessStatus(
  u: Pick<AdminUser, "suspended" | "planId" | "lifetime" | "expiresAt" | "cancelled">,
  now: Date = NOW,
): AccessStatus {
  if (u.suspended) return "suspenso";
  if (!u.planId) return "sem_plano";
  if (u.cancelled) return "expirado";
  if (u.lifetime) return "ativo";
  if (u.expiresAt && new Date(u.expiresAt).getTime() < now.getTime()) return "expirado";
  return "ativo";
}

export const statusLabel: Record<AccessStatus, string> = {
  ativo: "Ativo",
  expirado: "Expirado",
  suspenso: "Suspenso",
  sem_plano: "Sem plano",
};

export const statusTone = {
  ativo: "success",
  expirado: "warning",
  suspenso: "danger",
  sem_plano: "neutral",
} as const;

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function formatRelative(iso?: string, now: Date = NOW) {
  if (!iso) return "Nunca";
  const diff = Math.round((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (diff <= 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff < 30) return `Há ${diff} dias`;
  return formatDate(iso);
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(2)} TB`;
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "Impressão digital" curta de um texto — usada para saber se dados mudaram. */
export function hashString(text: string) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** "1h 45min", "52 min" (vazio se não souber a duração). */
export function formatDuration(minutes: number) {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}min` : `${h}h`;
}
