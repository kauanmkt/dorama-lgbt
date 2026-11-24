import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/ui";
import { listarPedidos, type RequestStatus } from "@/lib/request-actions";
import { RequestsManager } from "./RequestsManager";

export const metadata: Metadata = { title: "Pedidos de séries" };

const TABS: { key: RequestStatus | "todos"; label: string }[] = [
  { key: "pendente", label: "Pendentes" },
  { key: "adicionada", label: "Adicionadas" },
  { key: "recusada", label: "Recusadas" },
  { key: "todos", label: "Todos" },
];

/** Pedidos do "Solicitar série" (order bump): uma linha por pedido. */
export default async function PedidosPage({ searchParams }: PageProps<"/admin/pedidos">) {
  const { ver } = await searchParams;
  const status = (TABS.find((t) => t.key === ver)?.key ?? "pendente") as RequestStatus | "todos";
  const requests = await listarPedidos(status);

  return (
    <>
      <AdminHeader
        title="Pedidos de séries"
        description="O que os clientes pediram pelo botão + (Solicitar série). Ao marcar, o cliente recebe um aviso."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "pendente" ? "/admin/pedidos" : `/admin/pedidos?ver=${t.key}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-white/10 ${
              t.key === status ? "bg-brand-600 text-white" : "text-fg-muted hover:bg-white/5"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <RequestsManager key={status} initial={requests} />
    </>
  );
}
