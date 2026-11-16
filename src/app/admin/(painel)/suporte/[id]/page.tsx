import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ChatView } from "@/components/support/ChatView";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { mensagensDaConversa, responderConversa } from "@/lib/support-actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";
import { StatusButton } from "./StatusButton";

export const metadata: Metadata = { title: "Conversa" };

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export default async function SupportThread({ params }: PageProps<"/admin/suporte/[id]">) {
  const { id } = await params;
  if (!isSupabaseConfigured || !/^[0-9a-f-]{36}$/.test(id)) notFound();
  await requireAdmin();
  const supabase = await createSessionClient();
  const { data: thread } = await supabase
    .from("support_threads")
    .select("id, status, user_id, profiles(name, email)")
    .eq("id", id)
    .maybeSingle();
  if (!thread) notFound();
  const profile = thread.profiles as unknown as { name: string | null; email: string } | null;
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, lifetime, expires_at, plans(name)")
    .eq("user_id", thread.user_id)
    .maybeSingle();
  const plan = (sub?.plans as unknown as { name: string } | null)?.name;
  const initial = await mensagensDaConversa(id);

  async function load() {
    "use server";
    return mensagensDaConversa(id);
  }
  async function send(body: string) {
    "use server";
    return responderConversa(id, body);
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[480px] flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Link href="/admin/suporte" className="inline-flex items-center gap-1 text-sm font-semibold text-fg-muted hover:text-fg">
          <ChevronLeft className="size-4" /> Conversas
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold">{profile?.name || profile?.email}</p>
          <p className="truncate text-xs text-fg-muted">
            {profile?.email} ·{" "}
            {plan
              ? `${plan} — ${sub?.lifetime ? "vitalício" : `até ${formatDate(sub?.expires_at ?? undefined)}`} (${sub?.status})`
              : "sem plano"}
          </p>
        </div>
        <StatusButton id={id} status={thread.status as "aberto" | "resolvido"} />
      </div>
      <ChatView
        initial={initial}
        me="suporte"
        load={load}
        send={send}
        emptyText="Sem mensagens."
        placeholder="Responder…"
        className="flex-1"
      />
    </div>
  );
}
