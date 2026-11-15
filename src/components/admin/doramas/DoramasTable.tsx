"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clapperboard, ExternalLink, Eye, EyeOff, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Artwork } from "@/components/catalog/Artwork";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AdminHeader, EmptyState, Modal, SearchInput, Segmented, useToast } from "@/components/admin/ui";
import { formatRelative } from "@/lib/format";
import { alterarDestaque, alterarVisibilidade, excluirDorama } from "@/lib/content-actions";
import type { AdminDorama, Visibility } from "@/types/admin";
import type { Category } from "@/types/catalog";

type Filter = "todos" | Visibility;

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Lista de doramas do painel, com busca, filtro e ações rápidas. */
export function DoramasTable({
  initial,
  categories,
  now: nowIso,
}: {
  initial: AdminDorama[];
  categories: Category[];
  now: string;
}) {
  const now = new Date(nowIso);
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [toDelete, setToDelete] = useState<AdminDorama | null>(null);

  const catName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

  const shown = useMemo(() => {
    const q = normalize(query.trim());
    return items.filter(
      (d) => (filter === "todos" || d.visibility === filter) && (!q || normalize(d.title).includes(q)),
    );
  }, [items, query, filter]);

  const count = (v: Visibility) => items.filter((d) => d.visibility === v).length;

  /** Muda na tela na hora e salva no banco; se falhar, desfaz. */
  const optimistic = async (
    change: (list: AdminDorama[]) => AdminDorama[],
    action: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>,
    success: string,
  ) => {
    const before = items;
    setItems(change);
    const r = await action();
    if (!r.ok) {
      setItems(before);
      toast(r.error, "error");
      return;
    }
    toast(r.message ?? success);
  };

  const toggleVisibility = (d: AdminDorama) => {
    const next: Visibility = d.visibility === "publicado" ? "rascunho" : "publicado";
    optimistic(
      (list) => list.map((x) => (x.id === d.id ? { ...x, visibility: next } : x)),
      () => alterarVisibilidade(d.id, next),
      next === "publicado" ? `“${d.title}” publicado no catálogo` : `“${d.title}” voltou para rascunho`,
    );
  };

  const toggleFeatured = (d: AdminDorama) => {
    optimistic(
      (list) => list.map((x) => (x.id === d.id ? { ...x, isFeatured: !x.isFeatured } : x)),
      () => alterarDestaque(d.id, !d.isFeatured),
      d.isFeatured ? `“${d.title}” saiu dos destaques` : `“${d.title}” agora está em destaque`,
    );
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const d = toDelete;
    setToDelete(null);
    optimistic(
      (list) => list.filter((x) => x.id !== d.id),
      () => excluirDorama(d.id),
      `“${d.title}” excluído`,
    );
  };

  return (
    <>
      <AdminHeader
        title="Doramas"
        description="Cadastre, edite e publique o catálogo."
        actions={
          <ButtonLink href="/admin/doramas/novo" size="sm">
            <Plus /> Novo dorama
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "todos", label: "Todos", count: items.length },
            { value: "publicado", label: "Publicados", count: count("publicado") },
            { value: "rascunho", label: "Rascunhos", count: count("rascunho") },
          ]}
        />
        <SearchInput
          placeholder="Buscar dorama"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:w-72"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-ink-900/70">
        {shown.length === 0 ? (
          <EmptyState
            icon={<Clapperboard />}
            title="Nenhum dorama encontrado"
            description="Ajuste a busca ou cadastre um novo dorama."
          />
        ) : (
          <>
            {/* Cabeçalho da tabela (computador) */}
            <div className="hidden grid-cols-[minmax(0,1fr)_120px_110px_120px_168px] gap-4 border-b border-line px-5 py-3 text-xs font-bold tracking-wider text-fg-subtle uppercase md:grid">
              <span>Título</span>
              <span>Episódios</span>
              <span>Status</span>
              <span>Atualizado</span>
              <span className="text-right">Ações</span>
            </div>
            <ul className="divide-y divide-white/5">
              {shown.map((d) => {
                const eps = d.seasons.reduce((n, s) => n + s.episodes.length, 0);
                return (
                  <li
                    key={d.slug}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_120px_110px_120px_168px] md:px-5"
                  >
                    <Link href={`/admin/doramas/${d.slug}`} className="flex min-w-0 items-center gap-3">
                      <div className="h-16 w-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
                        <Artwork seed={d.artSeed} title={d.title} imageUrl={d.posterUrl} showTitle={false} />
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-bold">
                          {d.title}
                          {d.isFeatured && <Star className="size-3.5 shrink-0 fill-warning text-warning" aria-label="Em destaque" />}
                        </p>
                        <p className="truncate text-xs text-fg-subtle">
                          {d.categories.map(catName).join(" · ") || "Sem categoria"}
                        </p>
                        <p className="mt-1 text-xs text-fg-muted md:hidden">
                          {d.seasons.length} temp. · {eps} ep. · {formatRelative(d.updatedAt, now)}
                        </p>
                      </div>
                    </Link>

                    <span className="hidden text-sm text-fg-muted md:block">
                      {eps} <span className="text-fg-subtle">({d.seasons.length} temp.)</span>
                    </span>
                    <span className="justify-self-end md:justify-self-start">
                      <Badge tone={d.visibility === "publicado" ? "success" : "warning"}>
                        {d.visibility === "publicado" ? "Publicado" : "Rascunho"}
                      </Badge>
                    </span>
                    <span className="hidden text-sm text-fg-muted md:block">{formatRelative(d.updatedAt, now)}</span>

                    <div className="col-span-2 flex items-center gap-1 border-t border-white/5 pt-2 md:col-span-1 md:justify-end md:border-0 md:pt-0">
                      <IconAction label="Editar" href={`/admin/doramas/${d.slug}`}>
                        <Pencil />
                      </IconAction>
                      <IconAction
                        label={d.visibility === "publicado" ? "Despublicar" : "Publicar"}
                        onClick={() => toggleVisibility(d)}
                      >
                        {d.visibility === "publicado" ? <EyeOff /> : <Eye />}
                      </IconAction>
                      <IconAction
                        label={d.isFeatured ? "Remover destaque" : "Destacar na home"}
                        onClick={() => toggleFeatured(d)}
                        active={d.isFeatured}
                      >
                        <Star />
                      </IconAction>
                      {d.visibility === "publicado" && (
                        <IconAction label="Ver no site" href={`/dorama/${d.slug}`}>
                          <ExternalLink />
                        </IconAction>
                      )}
                      <IconAction label="Excluir" onClick={() => setToDelete(d)} danger>
                        <Trash2 />
                      </IconAction>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Excluir dorama?"
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" onClick={confirmDelete}>
              <Trash2 /> Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-fg-muted">
          <strong className="text-fg">{toDelete?.title}</strong> será removido do catálogo, junto com
          as temporadas, episódios e vídeos vinculados. Essa ação não pode ser desfeita.
        </p>
      </Modal>
    </>
  );
}

function IconAction({
  label,
  href,
  onClick,
  danger,
  active,
  children,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  const cls = `flex h-9 w-9 items-center justify-center rounded-lg transition-colors [&_svg]:size-4 ${
    danger
      ? "text-fg-muted hover:bg-danger/15 hover:text-danger"
      : active
        ? "text-warning hover:bg-white/10 [&_svg]:fill-warning"
        : "text-fg-muted hover:bg-white/10 hover:text-fg"
  }`;
  return href ? (
    <Link href={href} aria-label={label} title={label} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
