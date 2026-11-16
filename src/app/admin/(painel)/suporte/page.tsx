import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { NOW, formatRelative } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";
import { AutoRefresh } from "../importacao/AutoRefresh";

export const metadata: Metadata = { title: "Suporte" };

type Thread = {
  id: string;
  status: "aberto" | "resolvido";
  last_message_at: string;
  last_preview: string;
  unread_admin: number;
  profiles: { name: string | null; email: string } | null;
};

/** Caixa de entrada do suporte: uma conversa por cliente. */
export default async function SupportInbox({ searchParams }: PageProps<"/admin/suporte">) {
  const { ver } = await searchParams;
  const filtro = ver === "resolvidos" ? "resolvido" : "aberto";
  let threads: Thread[] = [];
  if (isSupabaseConfigured) {
    await requireAdmin();
    const supabase = await createSessionClient();
    const { data } = await supabase
      .from("support_threads")
      .select("id, status, last_message_at, last_preview, unread_admin, profiles(name, email)")
      .eq("status", filtro)
      .order("last_message_at", { ascending: false })
      .limit(200);
    threads = (data ?? []) as unknown as Thread[];
  }
  const now = isSupabaseConfigured ? new Date() : NOW;
  const unread = threads.reduce((n, t) => n + (t.unread_admin > 0 ? 1 : 0), 0);

  return (
    <>
      <AdminHeader
        title="Suporte"
        description={unread ? `${unread} ${unread === 1 ? "conversa esperando" : "conversas esperando"} resposta` : "Mensagens dos clientes"}
      />
      <AutoRefresh seconds={15} />
      <div className="mb-4 flex gap-2">
        {[
          ["abertos", "Em aberto"],
          ["resolvidos", "Resolvidos"],
        ].map(([key, label]) => (
          <Link
            key={key}
            href={key === "abertos" ? "/admin/suporte" : "/admin/suporte?ver=resolvidos"}
            className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-white/10 ${
              (key === "resolvidos") === (filtro === "resolvido") ? "bg-brand-600 text-white" : "text-fg-muted hover:bg-white/5"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      {threads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-fg-muted">
          {filtro === "aberto" ? "Nenhuma conversa em aberto. 🎉" : "Nenhuma conversa resolvida ainda."}
        </div>
      ) : (
        <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-line bg-ink-900/60">
          {threads.map((t) => {
            const name = t.profiles?.name || t.profiles?.email?.split("@")[0] || "Cliente";
            return (
              <li key={t.id}>
                <Link href={`/admin/suporte/${t.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.03]">
                  <span className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 font-extrabold uppercase">
                    {name[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className={`truncate ${t.unread_admin ? "font-extrabold" : "font-semibold"}`}>{name}</p>
                      <span className="ml-auto shrink-0 text-xs text-fg-subtle">{formatRelative(t.last_message_at, now)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`truncate text-sm ${t.unread_admin ? "text-fg" : "text-fg-muted"}`}>{t.last_preview}</p>
                      {t.unread_admin > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-success px-1.5 text-[11px] font-bold text-black">
                          {t.unread_admin}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
