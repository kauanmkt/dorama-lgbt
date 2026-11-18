"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { notificacoesNaoLidas } from "@/lib/notification-actions";
import { registerServiceWorker, resyncPush } from "@/lib/push-client";

/** Sino do cabeçalho: mostra quantas notificações não foram lidas. */
export function NotificationBell() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  // Prepara o app para receber notificações e confirma este aparelho no servidor
  useEffect(() => {
    registerServiceWorker().then(() => resyncPush().catch(() => {}));
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () =>
      notificacoesNaoLidas()
        .then((n) => alive && setUnread(n))
        .catch(() => {});
    load();
    const t = setInterval(load, 120_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pathname]);

  return (
    <Link
      href="/notificacoes"
      aria-label={unread ? `Notificações (${unread} novas)` : "Notificações"}
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-white/10 hover:text-fg"
    >
      <Bell className="size-5" />
      {unread > 0 && (
        <span className="absolute top-1 right-1 flex min-w-[18px] items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] leading-[18px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
