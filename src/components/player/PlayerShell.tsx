"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Artwork } from "@/components/catalog/Artwork";
import { salvarProgresso } from "@/lib/progress-actions";
import { pararTela, pingTela } from "@/lib/account-actions";
import { getDeviceId } from "@/lib/device-id";
import { cn } from "@/lib/utils";

type EpisodeInfo = { id: string; season: number; number: number; title: string; durationMin: number };

/**
 * PLAYER.
 *  - Com `src` (link temporário do R2): toca o vídeo de verdade, retoma de onde
 *    parou e salva o progresso a cada 15 s, ao pausar e ao sair.
 *  - Sem `src` (modo demonstração): simula o vídeo para validar a interface.
 */
export function PlayerShell({
  doramaSlug,
  doramaTitle,
  artSeed,
  episode,
  startPercent = 0,
  src,
  hls = false,
}: {
  doramaSlug: string;
  doramaTitle: string;
  artSeed: number;
  episode: EpisodeInfo;
  startPercent?: number;
  src?: string;
  /** vídeo em pedaços (HLS) — usa hls.js onde o navegador não toca sozinho */
  hls?: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [total, setTotal] = useState(episode.durationMin * 60);
  const [time, setTime] = useState(src ? 0 : Math.round((startPercent / 100) * episode.durationMin * 60));
  const [playing, setPlayingState] = useState(false);
  const [buffering, setBuffering] = useState(Boolean(src));
  const [failed, setFailed] = useState(false);
  /** Limite de telas atingido: quantas telas o plano permite */
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rootRef = useRef<HTMLDivElement>(null);

  // ---------- Controle do vídeo (real ou simulado) ----------
  const setPlaying = useCallback(
    (value: boolean | ((p: boolean) => boolean)) => {
      const v = videoRef.current;
      if (!src || !v) return setPlayingState(value);
      const want = typeof value === "function" ? value(!v.paused) : value;
      if (want) v.play().catch(() => setPlayingState(false));
      else v.pause();
    },
    [src],
  );

  const seekTo = useCallback(
    (t: number) => {
      const clamped = Math.max(0, Math.min(total, t));
      if (src && videoRef.current) videoRef.current.currentTime = clamped;
      setTime(clamped);
    },
    [src, total],
  );

  // Simula o avanço do tempo enquanto "toca" (só no modo demonstração)
  useEffect(() => {
    if (src || !playing) return;
    const t = setInterval(() => setTime((s) => Math.min(total, s + 1)), 1000);
    return () => clearInterval(t);
  }, [src, playing, total]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  // Vídeos HLS: hls.js (Chrome, Android, Windows) ou nativo (Safari/iPhone)
  useEffect(() => {
    const video = videoRef.current;
    if (!src || !hls || !video) return;
    let destroy: (() => void) | undefined;
    let cancelled = false;
    import("hls.js").then(({ default: Hls }) => {
      if (cancelled) return;
      if (Hls.isSupported()) {
        const player = new Hls({ maxBufferLength: 30 });
        player.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) player.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) player.recoverMediaError();
          else {
            setFailed(true);
            setBuffering(false);
          }
        });
        player.loadSource(src);
        player.attachMedia(video);
        destroy = () => player.destroy();
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else {
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [src, hls]);

  // ---------- Limite de telas (por login) ----------
  // Se a conta entrou em outro aparelho e este login caiu, para o vídeo e sai.
  const checkScreen = useCallback(async () => {
    const r = await pingTela(getDeviceId(), episode.id, navigator.userAgent).catch(() => ({ ok: true as const }));
    if (!r.ok && r.reason === "desconectado") {
      videoRef.current?.pause();
      // navegação completa: a rota apaga os cookies de login
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/api/sessao/encerrada";
    }
  }, [episode.id]);

  useEffect(() => {
    if (!src) return;
    checkScreen();
    const t = setInterval(checkScreen, 30_000);
    const device = getDeviceId();
    return () => {
      clearInterval(t);
      pararTela(device).catch(() => {});
    };
  }, [src, checkScreen]);

  // ---------- Progresso ----------
  const lastSaved = useRef(0);
  const save = useCallback(
    (force = false) => {
      const v = videoRef.current;
      if (!src || !v || !Number.isFinite(v.duration) || v.duration <= 0) return;
      if (!force && Math.abs(v.currentTime - lastSaved.current) < 5) return;
      lastSaved.current = v.currentTime;
      salvarProgresso({ episodeId: episode.id, positionSec: v.currentTime, durationSec: v.duration }).catch(() => {});
    },
    [src, episode.id],
  );

  useEffect(() => {
    if (!src || !playing) return;
    const t = setInterval(() => save(), 15_000);
    return () => clearInterval(t);
  }, [src, playing, save]);

  useEffect(() => {
    if (!src) return;
    const onHide = () => document.visibilityState === "hidden" && save(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      save(true);
    };
  }, [src, save]);

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

  const seek = (delta: number) => seekTo((src ? (videoRef.current?.currentTime ?? time) : time) + delta);

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

  return (
    <div
      ref={rootRef}
      onMouseMove={poke}
      onTouchStart={poke}
      className={cn("fixed inset-0 overflow-hidden bg-black select-none", !uiVisible && "cursor-none")}
    >
      {/* Tela do vídeo */}
      {src ? (
        <video
          ref={videoRef}
          src={hls ? undefined : src}
          playsInline
          autoPlay
          preload="auto"
          onClick={() => setPlaying((p) => !p)}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (Number.isFinite(v.duration)) setTotal(v.duration);
            // Retoma de onde parou (se não estava no finalzinho)
            if (startPercent > 0 && startPercent < 95) v.currentTime = (startPercent / 100) * v.duration;
          }}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onPlay={() => setPlayingState(true)}
          onPause={() => {
            setPlayingState(false);
            save(true);
          }}
          onWaiting={() => setBuffering(true)}
          onCanPlay={() => setBuffering(false)}
          onPlaying={() => setBuffering(false)}
          onError={() => {
            setFailed(true);
            setBuffering(false);
          }}
          onEnded={() => save(true)}
          className="absolute inset-0 h-full w-full bg-black object-contain"
        />
      ) : (
        <button
          type="button"
          aria-label={playing ? "Pausar" : "Reproduzir"}
          onClick={() => setPlaying((p) => !p)}
          className="absolute inset-0"
        >
          <Artwork seed={artSeed + episode.number} title={doramaTitle} variant="backdrop" />
          <span className="absolute inset-0 bg-black/30" />
        </button>
      )}

      {buffering && !failed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="size-12 animate-spin text-brand-300" />
        </div>
      )}


      {failed && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/85 px-6 text-center">
          <AlertTriangle className="size-8 text-warning" />
          <p className="font-bold">Não foi possível carregar o vídeo</p>
          <p className="max-w-xs text-sm text-white/70">Confira sua conexão e tente de novo.</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-1 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold hover:bg-brand-500"
          >
            Tentar de novo
          </button>
          <Link href={`/dorama/${doramaSlug}`} className="text-sm font-semibold text-white/70 hover:text-white">
            Voltar
          </Link>
        </div>
      )}

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
        <CenterButton
          label={playing ? "Pausar" : "Reproduzir"}
          onClick={() => setPlaying((p) => !p)}
          big
          hidden={buffering && playing}
        >
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
              max={Math.max(1, Math.floor(total))}
              value={Math.floor(time)}
              onChange={(e) => seekTo(Number(e.target.value))}
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
              {doramaTitle}
            </p>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
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
  hidden,
  children,
}: {
  label: string;
  onClick: () => void;
  big?: boolean;
  hidden?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "pointer-events-auto flex items-center justify-center rounded-full transition hover:scale-110 active:scale-95",
        hidden && "invisible",
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
