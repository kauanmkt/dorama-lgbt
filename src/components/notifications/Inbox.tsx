"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Bell, Clapperboard, Megaphone, MessageCircle, Play, Sparkles } from "lucide-react";
import { EnablePushBanner } from "@/components/notifications/EnablePushBanner";
import { marcarNotificacoesLidas, type InboxItem } from "@/lib/notification-actions";

const ICON: Record<string, typeof Bell> = {
  lancamento: Clapperboard,
  continuar: Play,
  saudade: Sparkles,
  aviso: Megaphone,
  suporte: MessageCircle,
};

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86_400) return `há ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86_400);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

export function Inbox({ items }: { items: InboxItem[] }) {
  // Abriu a caixa: tudo vira lido (o destaque continua até sair da página)
  useEffect(() => {
    if (items.some((i) => !i.read)) marcarNotificacoesLidas().catch(() => {});
  }, [items]);

  return (
    <div className="space-y-4">
      <EnablePushBanner />
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center">
          <Bell className="mx-auto size-8 text-fg-subtle" aria-hidden="true" />
          <p className="mt-3 font-semibold">Nenhuma notificação ainda</p>
          <p className="mt-1 text-sm text-fg-muted">Quando chegar dorama novo, ele aparece aqui.</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-line bg-ink-900/60">
          {items.map((n) => {
            const Icon = ICON[n.kind] ?? Bell;
            return (
              <li key={n.id}>
                <Link href={n.url} className={`flex gap-3.5 px-4 py-4 transition-colors hover:bg-white/[0.04] ${n.read ? "" : "bg-brand-950/40"}`}>
                  {n.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- capas vêm do Storage, já otimizadas
                    <img src={n.image} alt="" className="h-16 w-11 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-900/70 text-brand-300">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-start gap-2 font-bold">
                      <span className="min-w-0 flex-1">{n.title}</span>
                      {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent-500" aria-label="nova" />}
                    </p>
                    {n.body && <p className="mt-0.5 text-sm text-fg-muted">{n.body}</p>}
                    <p className="mt-1 text-xs text-fg-subtle">{timeAgo(n.createdAt)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
