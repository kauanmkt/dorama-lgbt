import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Settings } from "lucide-react";
import { Container } from "@/components/layout/PageIntro";
import { Inbox } from "@/components/notifications/Inbox";
import { minhasNotificacoes } from "@/lib/notification-actions";

export const metadata: Metadata = { title: "Notificações" };

export default function NotificationsPage() {
  return (
    <Container className="max-w-2xl pt-24 pb-10 md:pt-28">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Notificações</h1>
        <Link
          href="/perfil/notificacoes"
          className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-sm font-bold text-fg-muted transition hover:bg-white/5 hover:text-fg"
        >
          <Settings className="size-4" aria-hidden="true" /> Ajustes
        </Link>
      </div>
      <div className="mt-6">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-ink-850" />}>
          <Content />
        </Suspense>
      </div>
    </Container>
  );
}

async function Content() {
  const items = await minhasNotificacoes();
  return <Inbox items={items} />;
}
