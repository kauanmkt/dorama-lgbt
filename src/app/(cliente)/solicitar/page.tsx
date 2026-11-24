import type { Metadata } from "next";
import { Suspense } from "react";
import { SubPage } from "@/components/account/SubPage";
import { getSessionUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { meusPedidos, type SeriesRequest } from "@/lib/request-actions";
import { getPublicSetting } from "@/lib/settings";
import { RequestForm, RequestLocked } from "./RequestForm";

export const metadata: Metadata = { title: "Solicitar série" };

export default function SolicitarPage() {
  return (
    <SubPage title="Solicitar série" description="Não achou a série que queria? Peça para a gente adicionar na Amora.">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-ink-850" />}>
        <Content />
      </Suspense>
    </SubPage>
  );
}

async function Content() {
  const [{ credits, requests }, url, user] = await Promise.all([
    meusPedidos(),
    getPublicSetting<string>("request_checkout_url"),
    getSessionUser(),
  ]);
  const checkout = url?.trim() || "https://checkout.lowify.com.br/go.php?offer=5c3f45b7";
  return (
    <>
      {credits !== 0 ? (
        <RequestForm credits={credits} />
      ) : (
        <RequestLocked url={checkout} email={user?.email ?? null} again={requests.length > 0} />
      )}
      {requests.length > 0 && <History requests={requests} />}
    </>
  );
}

const STATUS: Record<SeriesRequest["status"], { label: string; cls: string }> = {
  pendente: { label: "Em análise", cls: "bg-amber-500/15 text-amber-300 ring-amber-400/30" },
  adicionada: { label: "Adicionada", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" },
  recusada: { label: "Não disponível", cls: "bg-white/5 text-fg-muted ring-white/10" },
};

function History({ requests }: { requests: SeriesRequest[] }) {
  return (
    <section className="rounded-2xl border border-line bg-ink-900/60 p-5">
      <h2 className="font-bold">Seus pedidos</h2>
      <ul className="mt-3 divide-y divide-white/5">
        {requests.map((r) => (
          <li key={r.id} className="py-3">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold break-words">{r.title}</p>
                <p className="text-xs text-fg-subtle">Pedido em {formatDate(r.createdAt)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${STATUS[r.status].cls}`}>
                {STATUS[r.status].label}
              </span>
            </div>
            {r.adminNote && <p className="mt-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-fg-muted">{r.adminNote}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
