import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatBytes } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { AutoRefresh } from "./AutoRefresh";

export const metadata: Metadata = { title: "Importação" };

type Row = {
  id: string;
  title: string;
  status: "pendente" | "copiando" | "pronto" | "erro" | "ignorado";
  segments_total: number;
  segments_done: number;
  bytes_copied: number;
  attempts: number;
  error: string | null;
  categories: string[];
  doramas: { slug: string; dorama_categories: { categories: { slug: string } | null }[] } | null;
};

const LABEL: Record<Row["status"], string> = {
  pendente: "Na fila",
  copiando: "Copiando",
  pronto: "Publicado",
  erro: "Erro",
  ignorado: "Ignorado",
};
const TONE: Record<Row["status"], string> = {
  pendente: "text-fg-subtle",
  copiando: "text-brand-300",
  pronto: "text-success",
  erro: "text-danger",
  ignorado: "text-fg-subtle",
};

/** Acompanhamento da cópia do catálogo antigo (CineDrama). */
export default async function ImportPage() {
  if (!isSupabaseConfigured) {
    return <AdminHeader title="Importação" description="Disponível só com o banco conectado." />;
  }
  await requireAdmin();
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("imports")
    .select("id, title, status, segments_total, segments_done, bytes_copied, attempts, error, categories, doramas(slug, dorama_categories(categories(slug)))")
    .order("status")
    .order("created_at");
  const rows = (data ?? []) as unknown as Row[];
  const { data: sync } = await supabase.from("settings").select("value").eq("key", "import_last_sync").maybeSingle();
  const lastSync = (sync?.value as { at?: string } | null)?.at;
  const noCategory = (r: Row) =>
    r.status === "pronto" &&
    !r.doramas?.dorama_categories?.some((dc) => dc.categories?.slug === "bl" || dc.categories?.slug === "gl");

  const count = (s: Row["status"]) => rows.filter((r) => r.status === s).length;
  const bytes = rows.reduce((a, r) => a + Number(r.bytes_copied), 0);
  const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const order: Row["status"][] = ["copiando", "erro", "pendente", "pronto", "ignorado"];
  const sorted = [...rows].sort(
    (a, b) => order.indexOf(a.status) - order.indexOf(b.status) || Number(noCategory(b)) - Number(noCategory(a)),
  );
  const running = count("copiando") + count("pendente") > 0;

  return (
    <>
      <AdminHeader
        title="Importação"
        description="Cópia automática dos doramas LGBT do catálogo antigo. A cada 30 minutos o sistema procura títulos novos na seção LGBT e publica cada um assim que o vídeo termina de copiar."
      />
      <p className="-mt-3 mb-5 text-sm text-fg-muted">
        Última verificação: <strong className="text-fg">{lastSync ? fmt.format(new Date(lastSync)) : "ainda não rodou"}</strong>
      </p>
      {running && <AutoRefresh seconds={20} />}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Publicados", count("pronto")],
          ["Copiando", count("copiando")],
          ["Na fila", count("pendente")],
          ["Com erro", count("erro")],
          ["Copiado", formatBytes(bytes)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-ink-900 p-4 ring-1 ring-white/10">
            <p className="text-xs font-semibold text-fg-subtle uppercase">{label}</p>
            <p className="font-display mt-1 text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>

      <Panel title={`Doramas (${rows.length})`}>
        <ul className="divide-y divide-white/5">
          {sorted.map((r) => {
            const pct = r.segments_total ? Math.round((r.segments_done / r.segments_total) * 100) : 0;
            return (
              <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {r.doramas?.slug && r.status === "pronto" ? (
                      <Link href={`/admin/doramas/${r.doramas.slug}`} className="hover:text-brand-300">
                        {r.title}
                      </Link>
                    ) : (
                      r.title
                    )}
                  </p>
                  {r.status === "copiando" && (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {r.error && r.status !== "pronto" && (
                    <p className={`mt-1 truncate text-xs ${r.status === "ignorado" ? "text-fg-subtle" : "text-danger"}`}>
                      {r.error} {r.attempts && r.status !== "ignorado" ? `(tentativa ${r.attempts}/8)` : ""}
                    </p>
                  )}
                  {noCategory(r) && (
                    <p className="mt-1 text-xs text-warning">Sem BL/GL no nome: abra e escolha a categoria.</p>
                  )}
                </div>
                <span className={`shrink-0 text-xs font-bold ${TONE[r.status]}`}>
                  {r.status === "copiando" ? `${pct}%` : LABEL[r.status]}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}
