"use client";

/**
 * Notificações no navegador/celular: tudo que roda no aparelho da pessoa.
 * iPhone/iPad: só funciona com o app instalado na tela de início (iOS 16.4+).
 */
import { ativarPush, chavePublicaPush, desativarPush } from "@/lib/notification-actions";

export type PushState =
  | "carregando"
  | "sem-suporte" // navegador não tem notificações
  | "instalar-iphone" // iPhone/iPad fora do app instalado
  | "bloqueado" // a pessoa negou a permissão
  | "desligado" // pode ativar
  | "ligado";

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

async function currentSubscription() {
  const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await registerServiceWorker());
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function getPushState(): Promise<PushState> {
  if (typeof window === "undefined") return "carregando";
  if (!supported()) return isIOS() && !isStandalone() ? "instalar-iphone" : "sem-suporte";
  if (isIOS() && !isStandalone()) return "instalar-iphone";
  if (Notification.permission === "denied") return "bloqueado";
  if (Notification.permission === "granted" && (await currentSubscription())) return "ligado";
  return "desligado";
}

function keyToBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Pede a permissão e registra este aparelho. */
export async function enablePush(): Promise<PushState> {
  if (!supported()) return getPushState();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "bloqueado" : "desligado";
  const reg = await registerServiceWorker();
  const key = await chavePublicaPush();
  if (!reg || !key) return "sem-suporte";
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) });
  const res = await ativarPush(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }, navigator.userAgent);
  return res.ok ? "ligado" : "desligado";
}

export async function disablePush(): Promise<PushState> {
  const sub = await currentSubscription();
  if (sub) {
    await desativarPush(sub.endpoint).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  return getPushState();
}

/** Se este aparelho já tem notificações, confirma no servidor (ex.: depois de entrar de novo). */
export async function resyncPush() {
  if (!supported() || Notification.permission !== "granted") return;
  const sub = await currentSubscription();
  if (sub) await ativarPush(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }, navigator.userAgent);
}
