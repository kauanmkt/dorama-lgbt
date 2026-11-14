"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileVideo, RefreshCw, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/admin/ui";
import { useSimulatedUpload } from "@/components/admin/upload";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PickedVideo = { name: string; size: number };

/**
 * Seletor + envio de vídeo de um episódio.
 * Mostra o vídeo atual (se houver), permite trocar e acompanha o envio.
 */
export function VideoPicker({
  current,
  onUploaded,
}: {
  current?: PickedVideo;
  onUploaded?: (v: PickedVideo) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<PickedVideo | null>(null);
  const [over, setOver] = useState(false);
  const { state, start, cancel, reset } = useSimulatedUpload();

  const pick = (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith("video/") && !/\.(mp4|m4v|mov)$/i.test(f.name)) return;
    const v = { name: f.name, size: f.size };
    setFile(v);
    start(f.size, () => onUploaded?.(v));
  };

  const shown = file ?? current;

  return (
    <div>
      {shown && state.status !== "enviando" ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-ink-850 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600/15 text-brand-300">
            <FileVideo className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{shown.name}</p>
            <p className="flex items-center gap-1 text-xs text-fg-subtle">
              {formatBytes(shown.size)}
              {(state.status === "concluido" || (!file && current)) && (
                <span className="flex items-center gap-1 text-success">
                  · <CheckCircle2 className="size-3" /> no R2
                </span>
              )}
              {state.status === "cancelado" && <span className="text-danger">· envio cancelado</span>}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <RefreshCw /> Trocar
          </Button>
        </div>
      ) : state.status === "enviando" && file ? (
        <div className="rounded-xl border border-brand-600/40 bg-brand-600/[0.06] p-4">
          <div className="flex items-center gap-3">
            <UploadCloud className="size-5 shrink-0 text-brand-300" />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">{file.name}</p>
            <button
              type="button"
              aria-label="Cancelar envio"
              onClick={() => {
                cancel();
                reset();
                setFile(null);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-fg-muted hover:bg-white/10"
            >
              <X className="size-4" />
            </button>
          </div>
          <ProgressBar value={state.percent} className="mt-3" />
          <p className="mt-2 flex justify-between text-xs text-fg-subtle tabular-nums">
            <span>
              {Math.floor(state.percent)}% · parte {Math.min(state.partsDone + 1, state.partsTotal)} de{" "}
              {state.partsTotal}
            </span>
            <span>{formatBytes(state.speed)}/s</span>
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            pick(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
            over ? "border-brand-400 bg-brand-600/10" : "border-line hover:border-brand-500/60",
          )}
        >
          <UploadCloud className="size-8 text-brand-300" />
          <span className="text-sm font-semibold">Arraste o vídeo ou clique para escolher</span>
          <span className="text-xs text-fg-subtle">MP4 · arquivos grandes são enviados em partes</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
