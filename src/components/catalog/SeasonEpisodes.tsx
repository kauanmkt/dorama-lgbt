"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Play } from "lucide-react";
import type { Season } from "@/types/catalog";
import { cn } from "@/lib/utils";
import { Artwork } from "./Artwork";

/** Seletor de temporada + lista de episódios da página do dorama. */
export function SeasonEpisodes({
  seasons,
  artSeed,
  title,
  progress = {},
  initialSeason,
}: {
  seasons: Season[];
  artSeed: number;
  title: string;
  /** episódio → % assistido */
  progress?: Record<string, number>;
  /** Abre direto na temporada que o usuário está assistindo */
  initialSeason?: number;
}) {
  const [current, setCurrent] = useState(
    initialSeason ?? seasons[0]?.number ?? 1,
  );
  const season = seasons.find((s) => s.number === current) ?? seasons[0];
  if (!season) return null;

  return (
    <section aria-labelledby="episodios">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 id="episodios" className="text-xl font-bold md:text-2xl">
          Episódios
        </h2>

        {seasons.length > 1 ? (
          <label className="relative">
            <span className="sr-only">Temporada</span>
            <select
              value={current}
              onChange={(e) => setCurrent(Number(e.target.value))}
              className="h-10 appearance-none rounded-full border border-line bg-ink-800 pr-10 pl-4 text-sm font-semibold text-fg outline-none hover:border-brand-500 focus:border-brand-500"
            >
              {seasons.map((s) => (
                <option key={s.number} value={s.number}>
                  Temporada {s.number}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-muted" />
          </label>
        ) : (
          <span className="text-sm font-semibold text-fg-muted">
            Temporada 1
          </span>
        )}
      </div>

      <ol className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-line bg-ink-900/50">
        {season.episodes.map((ep) => {
          const pct = progress[ep.id];
          return (
            <li key={ep.id}>
              <EpisodeLink
                href={ep.available ? `/assistir/${ep.id}` : undefined}
                className={cn(
                  "group flex gap-3 p-3 sm:gap-5 sm:p-4",
                  ep.available
                    ? "transition-colors hover:bg-white/[0.04]"
                    : "opacity-60",
                )}
              >
                <span className="font-display hidden w-8 shrink-0 self-center text-center text-xl font-bold text-fg-subtle sm:block">
                  {ep.number}
                </span>
                <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10 sm:w-44">
                  <Artwork
                    seed={artSeed + ep.number}
                    title={title}
                    imageUrl={ep.thumbnailUrl}
                    variant="backdrop"
                  />
                  {ep.available ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 ring-1 ring-white/50">
                        <Play className="size-4 translate-x-px fill-white text-white" />
                      </span>
                    </span>
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[11px] font-bold tracking-wider text-white uppercase">
                      Em breve
                    </span>
                  )}
                  {pct !== undefined && (
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="truncate text-[15px] font-bold">
                      <span className="sm:hidden">{ep.number}. </span>
                      {ep.title}
                    </h3>
                    <span className="shrink-0 text-xs font-semibold text-fg-subtle">
                      {ep.available ? `${ep.durationMin} min` : "Em breve"}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-1 line-clamp-2 text-sm leading-relaxed text-fg-muted",
                      "max-sm:line-clamp-2",
                    )}
                  >
                    {ep.synopsis}
                  </p>
                </div>
              </EpisodeLink>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Link quando o episódio está disponível; bloco simples quando ainda não. */
function EpisodeLink({
  href,
  className,
  children,
}: {
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className} aria-disabled="true">
      {children}
    </div>
  );
}
