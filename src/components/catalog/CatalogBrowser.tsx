"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Category, Dorama } from "@/types/catalog";
import { cn } from "@/lib/utils";
import { DoramaGrid } from "./DoramaGrid";

type Sort = "populares" | "recentes" | "az";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Busca + filtros do catálogo (usado em /buscar e /doramas).
 * Com o catálogo pequeno filtramos aqui mesmo; com milhares de títulos
 * a busca passa para o banco (Etapa 4).
 */
export function CatalogBrowser({
  doramas,
  categories,
  withSearch = false,
  autoFocus = false,
}: {
  doramas: Dorama[];
  categories: Category[];
  withSearch?: boolean;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("populares");

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const list = doramas.filter((d) => {
      if (category && !d.categories.includes(category)) return false;
      if (!q) return true;
      return normalize(
        [d.title, d.originalTitle, d.tagline, d.country, ...d.categories].join(" "),
      ).includes(q);
    });
    return [...list].sort((a, b) =>
      sort === "az"
        ? a.title.localeCompare(b.title, "pt-BR")
        : sort === "recentes"
          ? b.year - a.year || b.popularity - a.popularity
          : b.popularity - a.popularity,
    );
  }, [doramas, query, category, sort]);

  return (
    <div>
      {withSearch && (
        <div className="relative mb-5">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus={autoFocus}
            placeholder="Buscar por título, país ou categoria"
            aria-label="Buscar"
            className="h-14 w-full rounded-2xl border border-line bg-ink-850 pr-12 pl-12 text-base text-fg outline-none placeholder:text-fg-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-600/20 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-fg-muted hover:bg-white/10"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={!category} onClick={() => setCategory(null)}>
            Todos
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c.slug}
              active={category === c.slug}
              onClick={() => setCategory(category === c.slug ? null : c.slug)}
            >
              {c.name}
            </Chip>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Ordenar"
          className="h-9 rounded-full border border-line bg-ink-850 px-3 text-sm font-semibold text-fg-muted outline-none focus:border-brand-500"
        >
          <option value="populares">Mais populares</option>
          <option value="recentes">Mais recentes</option>
          <option value="az">A–Z</option>
        </select>
      </div>

      {results.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-fg-subtle">
            {results.length} {results.length === 1 ? "título" : "títulos"}
          </p>
          <DoramaGrid doramas={results} />
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-line py-16 text-center">
          <p className="font-display text-lg font-bold">Nada encontrado</p>
          <p className="mt-1 text-sm text-fg-muted">Tente outro nome ou remova os filtros.</p>
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
        active
          ? "bg-brand-600 text-white"
          : "bg-white/[0.06] text-fg-muted ring-1 ring-white/10 hover:bg-white/10 hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
