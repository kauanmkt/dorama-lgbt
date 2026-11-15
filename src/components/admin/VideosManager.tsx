"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  FileVideo,
  HardDrive,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  AdminHeader,
  EmptyState,
  Modal,
  ProgressBar,
  SearchInput,
  Segmented,
  useToast,
} from "@/components/admin/ui";
import { useVideoUpload, type FinishedUpload } from "@/components/admin/upload";
import { concluirEnvio, excluirVideo } from "@/lib/video-actions";
import { formatBytes, formatRelative, slugify } from "@/lib/format";
import { cn } from "@/lib/utils";

export type EpisodeRow = {
  episodeId: string;
  doramaTitle: string;
  doramaSlug: string;
  /** Já liberado (vídeo de demonstração) */
  ready?: boolean;
  video?: {
    key: string;
    fileName: string;
    sizeBytes: number;
    status: "pronto" | "processando";
    uploadedAt: string;
  };
};

type QueueItem = { id: string; file: File; name: string; size: number; episodeId: string };
type Filter = "todos" | "sem_video" | "com_video";

const label = (r: EpisodeRow) => r.doramaTitle;

/** CENTRAL DE VÍDEOS — envio em lote e biblioteca de arquivos no R2. */
export function VideosManager({ initial, now: nowIso }: { initial: EpisodeRow[]; now: string }) {
  const now = new Date(nowIso);
  const toast = useToast();
  const [rows, setRows] = useState(initial);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const [over, setOver] = useState(false);
  const [toDelete, setToDelete] = useState<EpisodeRow | null>(null);
  const bulkInput = useRef<HTMLInputElement>(null);
  const singleInput = useRef<HTMLInputElement>(null);
  const [singleTarget, setSingleTarget] = useState<string | null>(null);

  const missing = rows.filter((r) => !r.video);
  const total = rows.reduce((n, r) => n + (r.video?.sizeBytes ?? 0), 0);

  // Tenta adivinhar o dorama pelo nome do arquivo (ex.: "amor-em-seul.mp4")
  const guessEpisode = (name: string, taken: Set<string>) => {
    const n = slugify(name.replace(/\.[a-z0-9]+$/i, ""));
    const candidates = rows.filter((r) => !taken.has(r.episodeId));
    const byName = candidates
      .filter((r) => n.includes(r.doramaSlug))
      .sort((a, b) => b.doramaSlug.length - a.doramaSlug.length)[0];
    return byName?.episodeId ?? "";
  };

  const enqueue = (files: FileList | File[], target?: string) => {
    const taken = new Set(queue.map((q) => q.episodeId));
    const items: QueueItem[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("video/") && !/\.(mp4|m4v|mov)$/i.test(f.name)) continue;
      const episodeId = target ?? guessEpisode(f.name, taken);
      taken.add(episodeId);
      items.push({ id: `${Date.now()}-${f.name}-${Math.random()}`, file: f, name: f.name, size: f.size, episodeId });
    }
    if (items.length) setQueue((q) => [...items, ...q]);
  };

  /** Envio terminou: vincula ao episódio no banco e atualiza a lista. */
  const finish = async (item: QueueItem, upload: FinishedUpload) => {
    if (upload) {
      const res = await concluirEnvio({
        ...upload,
        episodeId: item.episodeId,
        fileName: item.name,
        size: item.size,
      });
      if (!res.ok) {
        toast(res.error, "error");
        return res;
      }
    }
    setRows((list) =>
      list.map((r) =>
        r.episodeId === item.episodeId
          ? {
              ...r,
              video: {
                key: upload?.key ?? `videos/demo/${item.name}`,
                fileName: item.name,
                sizeBytes: item.size,
                status: "pronto",
                uploadedAt: new Date().toISOString(),
              },
            }
          : r,
      ),
    );
    const r = rows.find((x) => x.episodeId === item.episodeId);
    toast(r ? `Vídeo vinculado a ${label(r)} — já disponível no site` : "Envio concluído");
    return { ok: true as const };
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (filter === "todos" || (filter === "sem_video" ? !r.video : Boolean(r.video))) &&
        (!q || label(r).toLowerCase().includes(q) || r.video?.fileName.toLowerCase().includes(q)),
    );
  }, [rows, filter, query]);

  return (
    <>
      <AdminHeader title="Vídeos" description="Envie e organize o vídeo de cada dorama." />

      {/* Resumo */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat icon={<HardDrive />} label="Armazenado" value={formatBytes(total)} />
        <Stat icon={<FileVideo />} label="Arquivos" value={String(rows.length - missing.length)} />
        <Stat icon={<UploadCloud />} label="Sem vídeo" value={String(missing.length)} warn={missing.length > 0} />
      </div>

      {/* Área de envio em lote */}
      <button
        type="button"
        onClick={() => bulkInput.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          enqueue(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          over ? "border-brand-400 bg-brand-600/10" : "border-line bg-ink-900/40 hover:border-brand-500/60",
        )}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/15 text-brand-300">
          <UploadCloud className="size-7" />
        </span>
        <span className="font-display mt-1 text-lg font-bold">Arraste vários vídeos de uma vez</span>
        <span className="max-w-md text-sm text-fg-muted">
          Nomeie como <code className="rounded bg-white/10 px-1 text-fg">nome-do-dorama.mp4</code> (o endereço da
          página do dorama) e o sistema vincula cada arquivo ao dorama certo automaticamente.
        </span>
      </button>
      <input
        ref={bulkInput}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) enqueue(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={singleInput}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && singleTarget) enqueue(e.target.files, singleTarget);
          e.target.value = "";
          setSingleTarget(null);
        }}
      />

      {/* Fila de envio */}
      {queue.length > 0 && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-ink-900/70">
          <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-[15px] font-bold">Fila de envio</h2>
            <button
              type="button"
              onClick={() => setQueue([])}
              className="text-xs font-semibold text-fg-subtle hover:text-fg"
            >
              Limpar concluídos
            </button>
          </header>
          <ul className="divide-y divide-white/5">
            {queue.map((item) => (
              <QueueRow
                key={item.id}
                item={item}
                options={rows.filter((r) => !r.video || r.episodeId === item.episodeId)}
                onLink={(episodeId) =>
                  setQueue((q) => q.map((x) => (x.id === item.id ? { ...x, episodeId } : x)))
                }
                onDone={finish}
                onRemove={() => setQueue((q) => q.filter((x) => x.id !== item.id))}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Biblioteca */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-ink-900/70">
        <header className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "todos", label: "Todos", count: rows.length },
              { value: "com_video", label: "Com vídeo", count: rows.length - missing.length },
              { value: "sem_video", label: "Sem vídeo", count: missing.length },
            ]}
          />
          <SearchInput
            placeholder="Buscar dorama ou arquivo"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="sm:w-72"
          />
        </header>

        {shown.length === 0 ? (
          <EmptyState icon={<FileVideo />} title="Nada por aqui" description="Nenhum dorama corresponde ao filtro." />
        ) : (
          <ul className="divide-y divide-white/5">
            {shown.slice(0, 60).map((r) => (
              <li key={r.episodeId} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    r.video ? "bg-brand-600/15 text-brand-300" : "bg-warning/10 text-warning",
                  )}
                >
                  {r.video ? <FileVideo className="size-5" /> : <UploadCloud className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {label(r)}
                  </p>
                  {r.video ? (
                    <p className="truncate font-mono text-[11px] text-fg-subtle" title={r.video.key}>
                      {r.video.key} · {formatBytes(r.video.sizeBytes)} · {formatRelative(r.video.uploadedAt, now)}
                    </p>
                  ) : (
                    <p className={cn("text-xs", r.ready ? "text-success" : "text-warning")}>
                      {r.ready ? "Vídeo de demonstração" : "Aguardando vídeo"}
                    </p>
                  )}
                </div>
                {r.video?.status === "processando" ? (
                  <Badge tone="brand">
                    <Loader2 className="size-3 animate-spin" /> Processando
                  </Badge>
                ) : r.video ? (
                  <Badge tone="success" className="hidden sm:inline-flex">
                    <CheckCircle2 className="size-3" /> Pronto
                  </Badge>
                ) : null}
                <Button
                  variant={r.video ? "ghost" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSingleTarget(r.episodeId);
                    singleInput.current?.click();
                  }}
                >
                  {r.video ? <RefreshCw /> : <UploadCloud />}
                  <span className="hidden sm:inline">{r.video ? "Substituir" : "Enviar"}</span>
                </Button>
                {r.video && (
                  <button
                    type="button"
                    aria-label="Excluir vídeo"
                    onClick={() => setToDelete(r)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-danger/15 hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {shown.length > 60 && (
          <p className="border-t border-line px-5 py-3 text-center text-xs text-fg-subtle">
            Mostrando 60 de {shown.length}. Use a busca para encontrar um dorama.
          </p>
        )}
      </section>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Excluir vídeo?"
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                const target = toDelete;
                setToDelete(null);
                if (!target) return;
                const res = await excluirVideo(target.episodeId);
                if (!res.ok) return toast(res.error, "error");
                setRows((list) => list.map((r) => (r.episodeId === target.episodeId ? { ...r, video: undefined } : r)));
                toast(res.message ?? "Vídeo excluído do armazenamento");
              }}
            >
              <Trash2 /> Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          O arquivo de <strong className="text-fg">{toDelete && label(toDelete)}</strong> será apagado do R2.
          O dorama continua cadastrado, mas aparece como “Em breve” até você enviar outro vídeo.
        </p>
      </Modal>
    </>
  );
}

function Stat({ icon, label, value, warn }: { icon: React.ReactNode; label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-line bg-ink-900/70 p-3 sm:p-4">
      <div className={cn("flex items-center gap-2 text-xs font-semibold [&_svg]:size-4", warn ? "text-warning" : "text-fg-muted")}>
        {icon}
        {label}
      </div>
      <p className="font-display mt-1.5 text-lg font-extrabold sm:text-2xl">{value}</p>
    </div>
  );
}

function QueueRow({
  item,
  options,
  onLink,
  onDone,
  onRemove,
}: {
  item: QueueItem;
  options: EpisodeRow[];
  onLink: (episodeId: string) => void;
  onDone: (item: QueueItem, upload: FinishedUpload) => Promise<{ ok: true } | { ok: false; error: string }>;
  onRemove: () => void;
}) {
  const { state, start, cancel } = useVideoUpload();
  // Guarda o episódio escolhido mais recente (pode mudar durante o envio)
  const itemRef = useRef(item);
  const started = useRef(false);
  useEffect(() => {
    itemRef.current = item;
  }, [item]);

  // Começa assim que houver um episódio escolhido
  useEffect(() => {
    if (started.current || !item.episodeId) return;
    started.current = true;
    start(item.file, (upload) => onDone(itemRef.current, upload));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.episodeId]);

  const done = state.status === "concluido";
  const failed = state.status === "erro";

  return (
    <li className="px-4 py-3.5 sm:px-5">
      <div className="flex items-center gap-3">
        <FileVideo className="size-5 shrink-0 text-fg-muted" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <p className="text-xs text-fg-subtle">{formatBytes(item.size)}</p>
        </div>
        {done ? (
          <span className="flex items-center gap-1 text-xs font-bold text-success">
            <CheckCircle2 className="size-4" /> Enviado
          </span>
        ) : state.status === "cancelado" ? (
          <span className="text-xs font-bold text-danger">Cancelado</span>
        ) : failed ? (
          <span className="text-xs font-bold text-danger">Falhou</span>
        ) : state.status === "finalizando" ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-brand-300">
            <Loader2 className="size-3.5 animate-spin" /> Finalizando
          </span>
        ) : !item.episodeId ? (
          <span className="text-xs font-semibold text-warning">Escolha o dorama</span>
        ) : (
          <span className="text-xs font-semibold text-fg-muted tabular-nums">{Math.floor(state.percent)}%</span>
        )}
        <button
          type="button"
          aria-label={done || failed ? "Remover da lista" : "Cancelar envio"}
          onClick={() => {
            if (!done && !failed) cancel();
            onRemove();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted hover:bg-white/10"
        >
          <X className="size-4" />
        </button>
      </div>
      {failed && <p className="mt-2 text-xs font-semibold text-danger">{state.error}</p>}
      {!done && !failed && state.status !== "cancelado" && (
        <>
          <ProgressBar value={state.percent} className="mt-2.5" />
          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="shrink-0 text-xs font-semibold text-fg-subtle">Vincular a</span>
            <select
              value={item.episodeId}
              disabled={state.status === "finalizando"}
              onChange={(e) => onLink(e.target.value)}
              className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-ink-850 px-2 text-sm text-fg outline-none focus:border-brand-500"
            >
              {!item.episodeId && <option value="">Escolha o dorama</option>}
              {options.map((r) => (
                <option key={r.episodeId} value={r.episodeId}>
                  {label(r)}
                </option>
              ))}
            </select>
            {state.partsTotal > 0 && (
              <span className="shrink-0 text-[11px] text-fg-subtle tabular-nums">
                parte {Math.min(state.partsDone + 1, state.partsTotal)}/{state.partsTotal} ·{" "}
                {formatBytes(state.speed)}/s
              </span>
            )}
          </div>
        </>
      )}
    </li>
  );
}
