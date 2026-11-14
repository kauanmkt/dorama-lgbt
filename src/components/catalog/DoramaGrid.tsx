import type { Dorama } from "@/types/catalog";
import { DoramaCard } from "./DoramaCard";

/** Grade de capas para páginas de listagem. */
export function DoramaGrid({ doramas }: { doramas: Dorama[] }) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8">
      {doramas.map((d) => (
        <div key={d.slug}>
          <DoramaCard dorama={d} />
          {/* A arte provisória já mostra o título; com capa real, mostramos embaixo */}
          {d.posterUrl && (
            <p className="mt-2 truncate text-sm font-semibold text-fg-muted">{d.title}</p>
          )}
        </div>
      ))}
    </div>
  );
}
