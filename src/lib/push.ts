import "server-only";

/**
 * ENVIO DE NOTIFICAÇÕES (sino do site + celular).
 *
 * Cada notificação vira uma linha em "notifications" (o sino) e, para quem
 * ativou no aparelho, uma notificação push. A combinação tipo + referência
 * nunca se repete para a mesma pessoa, então rodar a rotina duas vezes não
 * manda nada em dobro.
 *
 * As chaves do push (VAPID) são criadas na primeira vez e guardadas no banco,
 * numa tabela que só o servidor lê.
 */
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationKind = "lancamento" | "continuar" | "saudade" | "aviso" | "suporte" | "teste";

export type NotificationInput = {
  kind: NotificationKind;
  title: string;
  body: string;
  url: string;
  image?: string | null;
  /** Igual para todos os destinatários = a pessoa recebe uma vez só */
  ref?: string | null;
};

type Keys = { publicKey: string; privateKey: string };
let cachedKeys: Keys | null = null;

async function vapidKeys(): Promise<Keys> {
  if (cachedKeys) return cachedKeys;
  const admin = createAdminClient();
  const read = async () => {
    const { data } = await admin.from("app_secrets").select("value").eq("key", "vapid").maybeSingle();
    return (data?.value as Keys | undefined) ?? null;
  };
  let keys = await read();
  if (!keys?.publicKey || !keys?.privateKey) {
    const fresh = webpush.generateVAPIDKeys();
    await admin.from("app_secrets").upsert({ key: "vapid", value: fresh }, { onConflict: "key", ignoreDuplicates: true });
    keys = await read(); // se duas chamadas criarem juntas, vale a que ficou gravada
  }
  if (!keys) throw new Error("Não foi possível preparar as chaves de notificação");
  cachedKeys = keys;
  return keys;
}

/** Chave pública que o navegador usa para se inscrever. */
export async function getPushPublicKey(): Promise<string> {
  return (await vapidKeys()).publicKey;
}

/**
 * Grava a notificação para cada pessoa e manda o push.
 * Devolve quantas pessoas receberam (no sino) e quantos aparelhos o push alcançou.
 */
export async function notify(
  userIds: string[],
  n: NotificationInput,
  options: { push?: boolean } = {},
): Promise<{ people: number; devices: number }> {
  const ids = [...new Set(userIds)];
  if (!ids.length) return { people: 0, devices: 0 };
  const admin = createAdminClient();

  const row = {
    kind: n.kind,
    ref: n.ref ?? null,
    title: n.title.slice(0, 120),
    body: n.body.slice(0, 300),
    url: n.url.startsWith("/") ? n.url : "/",
    image: n.image ?? null,
  };

  // 1) caixa de entrada (só quem ainda não tinha esta notificação)
  const delivered: string[] = [];
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500).map((user_id) => ({ ...row, user_id }));
    const { data, error } = row.ref
      ? await admin
          .from("notifications")
          .upsert(chunk, { onConflict: "user_id,kind,ref", ignoreDuplicates: true })
          .select("user_id")
      : await admin.from("notifications").insert(chunk).select("user_id");
    if (error) throw new Error(`Erro ao gravar notificações: ${error.message}`);
    delivered.push(...(data ?? []).map((d) => d.user_id as string));
  }
  if (options.push === false || !delivered.length) return { people: delivered.length, devices: 0 };

  // 2) push para os aparelhos dessas pessoas
  const subs: { id: string; endpoint: string; p256dh: string; auth: string }[] = [];
  for (let i = 0; i < delivered.length; i += 300) {
    const { data } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", delivered.slice(i, i + 300));
    subs.push(...(data ?? []));
  }
  if (!subs.length) return { people: delivered.length, devices: 0 };

  const keys = await vapidKeys();
  const payload = JSON.stringify({ title: row.title, body: row.body, url: row.url, image: row.image, tag: n.kind });
  const options_ = {
    // "subject" = como o serviço de push nos identifica: o endereço do site (a Vercel informa)
    vapidDetails: {
      subject: `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || "dorama-lgbt.vercel.app"}`,
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    },
    TTL: 60 * 60 * 24,
    urgency: n.kind === "suporte" ? ("high" as const) : ("normal" as const),
  };

  let ok = 0;
  const dead: string[] = [];
  const queue = [...subs];
  const worker = async () => {
    for (let s = queue.shift(); s; s = queue.shift()) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, options_);
        ok++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) dead.push(s.id); // aparelho desinstalou ou bloqueou
        else console.error("[push]", status, (e as Error).message);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(20, queue.length) }, worker));
  if (dead.length) await admin.from("push_subscriptions").delete().in("id", dead);
  return { people: delivered.length, devices: ok };
}

/** Pessoas que devem receber um tipo de notificação (acesso ativo + preferência ligada). */
export async function recipients(kind: NotificationKind): Promise<string[]> {
  const { data, error } = await createAdminClient().rpc("notify_recipients", { p_kind: kind });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
}
