import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { BroadcastForm } from "./BroadcastForm";

export const metadata: Metadata = { title: "Notificações" };

const KIND_LABEL: Record<string, string> = {
  lancamento: "Lançamento",
  continuar: "Continuar assistindo",
  saudade: "Saudade",
  aviso: "Aviso",
  suporte: "Suporte",
  teste: "Teste",
};

/** Data de N dias atrás (fora do componente, como pede o React). */
function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** Notificações: quantos ativaram, envio manual e o que saiu recentemente. */
export default async function AdminNotificationsPage() {
  if (!isSupabaseConfigured) {
    return <AdminHeader title="Notificações" description="Disponível só com o banco conectado." />;
  }
  await requireAdmin();
  const admin = createAdminClient();
  const since = daysAgo(30);
  const [devices, people, recent] = await Promise.all([
    admin.from("push_subscriptions").select("id", { count: "exact", head: true }),
    admin.from("push_subscriptions").select("user_id"),
    admin
      .from("notifications")
      .select("kind, ref, title, body, created_at, read_at")
      .gte("created_at", since)
      .neq("kind", "teste")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);
  const peopleCount = new Set((people.data ?? []).map((p) => p.user_id)).size;

  // Agrupa envios iguais (mesmo tipo + título no mesmo minuto) para mostrar o histórico
  const groups = new Map<string, { kind: string; title: string; body: string; at: string; sent: number; read: number }>();
  for (const n of recent.data ?? []) {
    const key = `${n.kind}|${n.kind === "aviso" || n.kind === "lancamento" ? n.ref : n.created_at.slice(0, 13)}|${n.kind === "aviso" || n.kind === "lancamento" ? "" : n.title}`;
    const g = groups.get(key) ?? { kind: n.kind, title: n.title, body: n.body, at: n.created_at, sent: 0, read: 0 };
    g.sent++;
    if (n.read_at) g.read++;
    groups.set(key, g);
  }
  const history = [...groups.values()].slice(0, 30);
  const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

  return (
    <>
      <AdminHeader
        title="Notificações"
        description="Lançamentos, lembretes de continuar assistindo e saudade saem sozinhos. Aqui você manda avisos para todos os clientes."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ["Clientes com notificação ativa", peopleCount],
          ["Aparelhos", devices.count ?? 0],
          ["Enviadas (30 dias)", recent.data?.length ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl bg-ink-900 p-4 ring-1 ring-white/10">
            <p className="text-xs font-semibold text-fg-subtle uppercase">{label}</p>
            <p className="font-display mt-1 text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Enviar aviso para todos">
          <BroadcastForm />
        </Panel>

        <Panel title="Automáticas">
          <ul className="space-y-3 text-sm">
            <li>
              <strong>Lançamentos</strong> — quando um dorama é publicado (das 9h às 22h). Vários juntos viram uma
              notificação só.
            </li>
            <li>
              <strong>Continuar assistindo</strong> — 1 a 3 dias depois de parar no meio de um dorama (das 18h às 22h).
            </li>
            <li>
              <strong>Saudade</strong> — depois de 5 dias sem entrar, no máximo 1 por semana (das 18h às 22h).
            </li>
            <li>
              <strong>Suporte</strong> — na hora em que você responde no chat.
            </li>
          </ul>
          <p className="mt-4 text-xs text-fg-subtle">
            Lembretes vão no máximo 1 por dia para cada pessoa, e só para quem tem plano ativo e não desligou aquele tipo.
          </p>
        </Panel>
      </div>

      <Panel title="Enviadas recentemente" className="mt-6">
        {history.length === 0 ? (
          <p className="text-sm text-fg-muted">Nada enviado nos últimos 30 dias.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {history.map((h, i) => (
              <li key={i} className="flex items-start gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{h.title}</p>
                  {h.body && <p className="mt-0.5 truncate text-fg-muted">{h.body}</p>}
                  <p className="mt-1 text-xs text-fg-subtle">
                    {KIND_LABEL[h.kind] ?? h.kind} · {fmt.format(new Date(h.at))}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-fg-muted">
                  <p>
                    <strong className="text-fg">{h.sent}</strong> {h.sent === 1 ? "pessoa" : "pessoas"}
                  </p>
                  <p>{h.read} abriram</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
