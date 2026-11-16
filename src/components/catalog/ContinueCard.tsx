import Link from "next/link";
import { Play } from "lucide-react";
import type { Dorama, Episode } from "@/types/catalog";
import { formatDuration } from "@/lib/format";
import { Artwork } from "./Artwork";

/** Card de "Continuar Assistindo": banner do dorama com barra de progresso. */
export function ContinueCard({
  dorama,
  episode,
  percent,
}: {
  dorama: Dorama;
  episode: Episode;
  percent: number;
}) {
  return (
    <Link href={`/assistir/${episode.id}`} className="group block">
      <div className="relative aspect-video overflow-hidden rounded-xl ring-1 ring-white/10 transition duration-300 group-hover:ring-brand-500/70">
        <Artwork
          seed={dorama.artSeed}
          title={dorama.title}
          imageUrl={episode.thumbnailUrl ?? dorama.bannerUrl}
          fallbackUrl={dorama.posterUrl}
          variant="backdrop"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <span className="absolute inset-0 m-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/45 ring-1 ring-white/40 backdrop-blur-sm transition group-hover:scale-110 group-hover:bg-brand-600 group-hover:ring-brand-400">
          <Play className="size-5 translate-x-px fill-white text-white" />
        </span>
        <p className="font-display absolute bottom-3 left-3 text-sm font-extrabold text-white uppercase drop-shadow">
          {dorama.title}
        </p>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
          <div className="h-full bg-brand-500" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-fg-muted">
        {episode.durationMin > 0
          ? `Faltam ${formatDuration(Math.max(1, Math.round(episode.durationMin * (1 - percent / 100))))}`
          : `${Math.round(percent)}% assistido`}
      </p>
    </Link>
  );
}
