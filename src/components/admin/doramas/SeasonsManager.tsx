"use client";

import { useState } from "react";
import { ChevronDown, Film, Info, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, Modal, TextArea, TextInput, useToast } from "@/components/admin/ui";
import { VideoPicker, type PickedVideo } from "@/components/admin/VideoPicker";
import { cn } from "@/lib/utils";

export type EditorEpisode = {
  id: string;
  number: number;
  title: string;
  synopsis: string;
  durationMin: number;
  video?: PickedVideo & { status: "pronto" | "processando" };
  /** Episódio já liberado para assistir (vídeo pronto) */
  ready?: boolean;
};

export type EditorSeason = { number: number; episodes: EditorEpisode[] };

/** Gerenciador de temporadas e episódios dentro do editor do dorama. */
export function SeasonsManager({
  seasons,
  onChange,
}: {
  seasons: EditorSeason[];
  onChange: (s: EditorSeason[]) => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState<number | null>(seasons[0]?.number ?? null);
  const [editing, setEditing] = useState<{ season: number; episode?: EditorEpisode } | null>(null);
  const [removeSeason, setRemoveSeason] = useState<number | null>(null);

  const addSeason = () => {
    const number = (seasons.at(-1)?.number ?? 0) + 1;
    onChange([...seasons, { number, episodes: [] }]);
    setOpen(number);
    toast(`Temporada ${number} criada`);
  };

  const saveEpisode = (seasonNumber: number, ep: EditorEpisode) => {
    onChange(
      seasons.map((s) => {
        if (s.number !== seasonNumber) return s;
        const exists = s.episodes.some((e) => e.id === ep.id);
        const episodes = exists ? s.episodes.map((e) => (e.id === ep.id ? ep : e)) : [...s.episodes, ep];
        return { ...s, episodes: episodes.sort((a, b) => a.number - b.number) };
      }),
    );
    toast(`Episódio ${ep.number} pronto — clique em Salvar para gravar`);
  };

  const deleteEpisode = (seasonNumber: number, id: string) => {
    onChange(
      seasons.map((s) =>
        s.number === seasonNumber ? { ...s, episodes: s.episodes.filter((e) => e.id !== id) } : s,
      ),
    );
    toast("Episódio removido — clique em Salvar para confirmar");
  };

  return (
    <>
      {seasons.length === 0 ? (
        <EmptyState
          icon={<Film />}
          title="Nenhuma temporada ainda"
          description="Crie a primeira temporada para começar a adicionar episódios."
          action={
            <Button size="sm" onClick={addSeason}>
              <Plus /> Criar temporada 1
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {seasons.map((s) => {
            const isOpen = open === s.number;
            const missing = s.episodes.filter((e) => !e.video && !e.ready).length;
            return (
              <div key={s.number} className="overflow-hidden rounded-xl border border-line bg-ink-850/60">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : s.number)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.03]"
                >
                  <span className="font-bold">Temporada {s.number}</span>
                  <span className="text-sm text-fg-subtle">
                    {s.episodes.length} {s.episodes.length === 1 ? "episódio" : "episódios"}
                  </span>
                  {missing > 0 && <Badge tone="warning">{missing} sem vídeo</Badge>}
                  <ChevronDown className={cn("ml-auto size-5 text-fg-muted transition-transform", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                  <div className="border-t border-line">
                    {s.episodes.length > 0 && (
                      <ul className="divide-y divide-white/5">
                        {s.episodes.map((ep) => (
                          <li key={ep.id} className="flex items-center gap-3 px-4 py-3">
                            <span className="font-display w-7 shrink-0 text-center text-lg font-bold text-fg-subtle">
                              {ep.number}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold">{ep.title || "Sem título"}</p>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
                                {ep.durationMin} min ·
                                {ep.video?.status === "pronto" && <span className="text-success">Vídeo pronto</span>}
                                {ep.video?.status === "processando" && (
                                  <span className="flex items-center gap-1 text-brand-300">
                                    <Loader2 className="size-3 animate-spin" /> Processando
                                  </span>
                                )}
                                {!ep.video && ep.ready && <span className="text-success">Liberado</span>}
                                {!ep.video && !ep.ready && <span className="text-warning">Sem vídeo</span>}
                              </p>
                            </div>
                            <button
                              type="button"
                              aria-label="Editar episódio"
                              onClick={() => setEditing({ season: s.number, episode: ep })}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-white/10 hover:text-fg"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              aria-label="Excluir episódio"
                              onClick={() => deleteEpisode(s.number, ep.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-danger/15 hover:text-danger"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => setEditing({ season: s.number })}>
                        <Plus /> Adicionar episódio
                      </Button>
                      <button
                        type="button"
                        onClick={() => setRemoveSeason(s.number)}
                        className="text-xs font-semibold text-fg-subtle hover:text-danger"
                      >
                        Excluir temporada
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={addSeason}>
            <Plus /> Nova temporada
          </Button>
        </div>
      )}

      {editing && (
        <EpisodeModal
          key={editing.episode?.id ?? `new-${editing.season}`}
          seasonNumber={editing.season}
          episode={editing.episode}
          nextNumber={(seasons.find((s) => s.number === editing.season)?.episodes.at(-1)?.number ?? 0) + 1}
          onClose={() => setEditing(null)}
          onSave={(ep) => {
            saveEpisode(editing.season, ep);
            setEditing(null);
          }}
        />
      )}

      <Modal
        open={removeSeason !== null}
        onClose={() => setRemoveSeason(null)}
        title={`Excluir temporada ${removeSeason}?`}
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setRemoveSeason(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                onChange(seasons.filter((s) => s.number !== removeSeason));
                toast(`Temporada ${removeSeason} removida — clique em Salvar para confirmar`);
                setRemoveSeason(null);
              }}
            >
              <Trash2 /> Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          Todos os episódios e vídeos desta temporada também serão excluídos.
        </p>
      </Modal>
    </>
  );
}

function EpisodeModal({
  seasonNumber,
  episode,
  nextNumber,
  onClose,
  onSave,
}: {
  seasonNumber: number;
  episode?: EditorEpisode;
  nextNumber: number;
  onClose: () => void;
  onSave: (ep: EditorEpisode) => void;
}) {
  const [number, setNumber] = useState(episode?.number ?? nextNumber);
  const [title, setTitle] = useState(episode?.title ?? "");
  const [synopsis, setSynopsis] = useState(episode?.synopsis ?? "");
  const [duration, setDuration] = useState(episode?.durationMin ?? 45);
  const [video, setVideo] = useState(episode?.video);
  const [error, setError] = useState("");
  // Episódio já gravado no banco? (ids provisórios começam com "novo-")
  const saved = Boolean(episode && !episode.id.startsWith("novo-"));

  const save = () => {
    if (!title.trim()) return setError("Dê um título ao episódio.");
    onSave({
      id: episode?.id ?? `novo-${Date.now()}`,
      number,
      title: title.trim(),
      synopsis: synopsis.trim(),
      durationMin: duration,
      video,
      ready: episode?.ready || Boolean(video),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={episode ? `Editar episódio ${episode.number}` : "Novo episódio"}
      description={`Temporada ${seasonNumber}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={save}>
            Salvar episódio
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[110px_minmax(0,1fr)_130px]">
        <TextInput
          label="Número"
          type="number"
          min={1}
          value={number}
          onChange={(e) => setNumber(Number(e.target.value))}
        />
        <TextInput
          label="Título"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setError("");
          }}
          placeholder="Ex.: O primeiro encontro"
          error={error}
          autoFocus
        />
        <TextInput
          label="Duração (min)"
          type="number"
          min={1}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />
      </div>
      <TextArea
        label="Sinopse do episódio"
        value={synopsis}
        onChange={(e) => setSynopsis(e.target.value)}
        placeholder="Resumo curto, sem spoilers"
        wrapperClassName="mt-4"
        rows={3}
      />
      <div className="mt-4">
        <p className="mb-1.5 text-sm font-semibold text-fg-muted">Vídeo</p>
        {saved && episode ? (
          <VideoPicker
            episodeId={episode.id}
            current={video}
            onUploaded={(v) => setVideo({ ...v, status: "pronto" })}
          />
        ) : (
          <p className="flex items-start gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5 text-xs text-fg-muted ring-1 ring-white/10">
            <Info className="mt-0.5 size-3.5 shrink-0 text-brand-300" />
            Salve o dorama primeiro; depois abra este episódio de novo para enviar o vídeo (ou use a tela Vídeos).
          </p>
        )}
      </div>
    </Modal>
  );
}
