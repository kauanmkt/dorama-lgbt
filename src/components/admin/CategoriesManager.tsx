"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AdminHeader, EmptyState, Modal, TextArea, TextInput, useToast } from "@/components/admin/ui";
import { slugify } from "@/lib/format";
import { excluirCategoria, ordenarCategorias, salvarCategoria } from "@/lib/content-actions";
import type { Category } from "@/types/catalog";

type Row = Category & { count: number };

/**
 * CATEGORIAS — criar, editar, excluir e ordenar.
 * A ordem aqui é a ordem das fileiras na página inicial.
 */
export function CategoriesManager({ initial }: { initial: Row[] }) {
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const before = rows;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
    const r = await ordenarCategorias(next.map((c) => c.slug));
    if (!r.ok) {
      setRows(before);
      toast(r.error, "error");
    }
  };

  /** Devolve a mensagem de erro (para mostrar no formulário) ou nada se deu certo. */
  const save = async (c: Row, previousSlug?: string): Promise<string | undefined> => {
    const r = await salvarCategoria({
      slug: c.slug,
      name: c.name,
      description: c.description,
      isNew: !previousSlug,
    });
    if (!r.ok) return r.error;
    setRows((list) =>
      previousSlug ? list.map((x) => (x.slug === previousSlug ? c : x)) : [...list, c],
    );
    toast(r.message ?? (previousSlug ? "Categoria atualizada" : `Categoria “${c.name}” criada`));
    setEditing(null);
  };

  const remove = async (c: Row) => {
    setToDelete(null);
    const r = await excluirCategoria(c.slug);
    if (!r.ok) return toast(r.error, "error");
    setRows((l) => l.filter((x) => x.slug !== c.slug));
    toast(r.message ?? "Categoria excluída");
  };

  return (
    <>
      <AdminHeader
        title="Categorias"
        description="A ordem desta lista define a ordem das fileiras na página inicial."
        actions={
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus /> Nova categoria
          </Button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-line bg-ink-900/70">
        {rows.length === 0 ? (
          <EmptyState icon={<FolderTree />} title="Nenhuma categoria" description="Crie a primeira categoria." />
        ) : (
          <ul className="divide-y divide-white/5">
            {rows.map((c, i) => (
              <li key={c.slug} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label="Mover para cima"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="flex h-6 w-7 items-center justify-center rounded text-fg-subtle hover:bg-white/10 hover:text-fg disabled:opacity-25"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Mover para baixo"
                    disabled={i === rows.length - 1}
                    onClick={() => move(i, 1)}
                    className="flex h-6 w-7 items-center justify-center rounded text-fg-subtle hover:bg-white/10 hover:text-fg disabled:opacity-25"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{c.name}</p>
                  <p className="truncate text-xs text-fg-subtle">
                    /categoria/{c.slug}
                    {c.description && <> · {c.description}</>}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-fg-muted">
                  {c.count} {c.count === 1 ? "título" : "títulos"}
                </span>
                <button
                  type="button"
                  aria-label="Editar"
                  onClick={() => setEditing(c)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-white/10 hover:text-fg"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Excluir"
                  onClick={() => setToDelete(c)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-danger/15 hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <CategoryModal
          initial={editing === "new" ? undefined : editing}
          taken={rows.map((r) => r.slug)}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title={`Excluir “${toDelete?.name}”?`}
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => toDelete && remove(toDelete)}
            >
              <Trash2 /> Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          {toDelete && toDelete.count > 0
            ? `${toDelete.count} doramas usam esta categoria. Eles continuam no catálogo, apenas perdem esta marcação.`
            : "Nenhum dorama usa esta categoria."}
        </p>
      </Modal>
    </>
  );
}

function CategoryModal({
  initial,
  taken,
  onClose,
  onSave,
}: {
  initial?: Row;
  taken: string[];
  onClose: () => void;
  onSave: (c: Row, previousSlug?: string) => Promise<string | undefined>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const slug = initial?.slug ?? slugify(name);

  const submit = async () => {
    if (!name.trim()) return setError("Dê um nome à categoria.");
    if (!initial && taken.includes(slug)) return setError("Já existe uma categoria com esse nome.");
    setBusy(true);
    const err = await onSave(
      { slug, name: name.trim(), description: description.trim(), count: initial?.count ?? 0 },
      initial?.slug,
    );
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "Editar categoria" : "Nova categoria"}
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy ? "Salvando…" : "Salvar"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextInput
          label="Nome"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder="Ex.: Ação"
          error={error}
          hint={slug && `Endereço: /categoria/${slug}`}
          autoFocus
        />
        <TextArea
          label="Descrição (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Aparece no topo da página da categoria"
        />
      </div>
    </Modal>
  );
}
