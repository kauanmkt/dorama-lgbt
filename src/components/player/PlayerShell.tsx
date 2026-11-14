"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Artwork } from "@/components/catalog/Artwork";
import { cn } from "@/lib/utils";

type EpisodeInfo = { id: string; season: number; number: number; title: string; durationMin: number };

/**
 * PLAYER — interface visual (Etapa 2).
 * Os controles já funcionam na tela; o vídeo real (MP4/HLS vindo do R2),
 * o salvamento do progresso e o retomar de onde parou entram na Etapa 8.
 */
export function PlayerShell({
  doramaSlug,
  doramaTitle,
  artSeed,
  episode,
  next,
  startPercent = 0,
}: {
  doramaSlug: string;
  doramaTitle: string;
  artSeed: number;
  episode: EpisodeInfo;
  next?: EpisodeInfo;
  startPercent?: number;
}) {
  const total = episode.durationMin * 60;
  const [time, setTime] = useState(Math.round((startPercent / 100) * total));
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rootRef = useRef<HTMLDivElement>(null);

  // Simula o avanço do tempo enquanto "toca"
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setTime((s) => Math.min(total, s + 1)), 1000);
    return () => clearInterval(t);
  }, [playing, total]);

  // Esconde os controles depois de 3s sem mexer o mouse/dedo
  const poke = useCallback(() => {
    setShowUi(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowUi(false), 3000);
  }, []);
  useEffect(() => {
    if (!playing) {
      clearTimeout(hideTimer.current);
      return;
    }
    hideTimer.current = setTimeout(() => setShowUi(false), 3000);
    return () => clearTimeout(hideTimer.current);
  }, [playing]);
  const uiVisible = showUi || !playing;

  const seek = (delta: number) => setTime((s) => Math.max(0, Math.min(total, s + delta)));

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await rootRef.current?.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      /* alguns navegadores (iPhone) usam a tela cheia nativa do vídeo */
    }
  };

  // Atalhos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") seek(10);
      else if (e.key === "ArrowLeft") seek(-10);
      else if (e.key === "m") setMuted((m) => !m);
      else if (e.key === "f") toggleFullscreen();
      poke();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poke]);

  const pct = total ? (time / total) * 100 : 0;
  const nearEnd = next && total - time <= 60;

  return (
    <div
      ref={rootRef}
      onMouseMove={poke}
      onTouchStart={poke}
      className={cn("fixed inset-0 overflow-hidden bg-black select-none", !uiVisible && "cursor-none")}
    >
      {/* "Tela" do vídeo (provisória) */}
      <button
        type="button"
        aria-label={playing ? "Pausar" : "Reproduzir"}
        onClick={() => setPlaying((p) => !p)}
        className="absolute inset-0"
      >
        <Artwork seed={artSeed + episode.number} title={doramaTitle} variant="backdrop" />
        <span className="absolute inset-0 bg-black/30" />
      </button>

      {/* Topo */}
      <div
        className={cn(
          "pt-safe pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300",
          uiVisible ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="pointer-events-auto flex items-center gap-3 p-4 sm:p-6">
          <Link
            href={`/dorama/${doramaSlug}`}
            aria-label="Voltar"
            className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-white/15"
          >
            <ArrowLeft className="size-6" />
          </Link>
          <div className="min-w-0">
            <p className="font-display truncate text-sm font-extrabold uppercase sm:text-base">
              {doramaTitle}
            </p>
            <p className="truncate text-xs text-white/70 sm:text-sm">
              T{episode.season}:E{episode.number} · {episode.title}
            </p>
          </div>
        </div>
      </div>

      {/* Centro: voltar 10s / play / avançar 10s */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center gap-10 transition-opacity duration-300 sm:gap-16",
          uiVisible ? "opacity-100" : "opacity-0",
        )}
      >
        <CenterButton label="Voltar 10 segundos" onClick={() => seek(-10)}>
          <RotateCcw className="size-7" />
        </CenterButton>
        <CenterButton label={playing ? "Pausar" : "Reproduzir"} onClick={() => setPlaying((p) => !p)} big>
          {playing ? (
            <Pause className="size-9 fill-white" />
          ) : (
            <Play className="size-9 translate-x-0.5 fill-white" />
          )}
        </CenterButton>
        <CenterButton label="Avançar 10 segundos" onClick={() => seek(10)}>
          <RotateCw className="size-7" />
        </CenterButton>
      </div>

      {/* Próximo episódio (aparece no finalzinho) */}
      {next && (
        <Link
          href={`/assistir/${next.id}`}
          className={cn(
            "absolute right-4 bottom-28 flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black shadow-2xl transition-all duration-500 hover:bg-white/85 sm:right-8",
            nearEnd ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
          )}
        >
          <SkipForward className="size-4 fill-black" /> Próximo episódio
        </Link>
      )}

      {/* Barra inferior */}
      <div
        className={cn(
          "pb-safe absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 transition-opacity duration-300",
          uiVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="px-4 pb-4 sm:px-8 sm:pb-6">
          {/* Linha do tempo */}
          <div className="flex items-center gap-3 text-xs font-semibold tabular-nums">
            <span>{fmt(time)}</span>
            <input
              type="range"
              min={0}
              max={total}
              value={time}
              onChange={(e) => setTime(Number(e.target.value))}
              aria-label="Linha do tempo"
              className="player-range h-1 flex-1"
              style={{ "--pct": `${pct}%` } as React.CSSProperties}
            />
            <span className="text-white/70">-{fmt(total - time)}</span>
          </div>

          <div className="mt-3 flex items-center gap-1 sm:gap-2">
            <IconButton label={playing ? "Pausar" : "Reproduzir"} onClick={() => setPlaying((p) => !p)}>
              {playing ? <Pause className="fill-white" /> : <Play className="fill-white" />}
            </IconButton>
            <IconButton label="Voltar 10 segundos" onClick={() => seek(-10)} className="hidden sm:flex">
              <RotateCcw />
            </IconButton>
            <IconButton label="Avançar 10 segundos" onClick={() => seek(10)} className="hidden sm:flex">
              <RotateCw />
            </IconButton>
            <IconButton label={muted ? "Ativar som" : "Silenciar"} onClick={() => setMuted((m) => !m)}>
              {muted ? <VolumeX /> : <Volume2 />}
            </IconButton>

            <p className="ml-2 hidden min-w-0 truncate text-sm font-semibold text-white/80 md:block">
              {doramaTitle} · T{episode.season}:E{episode.number}
            </p>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              {next && (
                <Link
                  href={`/assistir/${next.id}`}
                  className="flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold transition hover:bg-white/15"
                >
                  <SkipForward className="size-5" />
                  <span className="hidden sm:inline">Próximo</span>
                </Link>
              )}
              <IconButton label={fullscreen ? "Sair da tela cheia" : "Tela cheia"} onClick={toggleFullscreen}>
                {fullscreen ? <Minimize /> : <Maximize />}
              </IconButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

function CenterButton({
  label,
  onClick,
  big,
  children,
}: {
  label: string;
  onClick: () => void;
  big?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "pointer-events-auto flex items-center justify-center rounded-full transition hover:scale-110 active:scale-95",
        big ? "h-20 w-20 bg-brand-600/90 shadow-[0_0_60px] shadow-brand-600/60" : "h-14 w-14 bg-black/40",
      )}
    >
      {children}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-white/15 [&_svg]:size-5",
        className,
      )}
    >
      {children}
    </button>
  );
}
