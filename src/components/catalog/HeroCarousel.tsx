"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Info, Play } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Artwork } from "./Artwork";
import { MyListButton } from "./MyListButton";

export type HeroItem = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  synopsis: string;
  year: number;
  ageRating: string;
  categories: string[];
  episodes: number;
  artSeed: number;
  bannerUrl?: string;
  firstEpisodeId?: string;
  inMyList: boolean;
};

/**
 * Banner principal: alterna entre os doramas marcados como destaque no painel.
 * `interval` (segundos) vem das Configurações; 0 = não troca sozinho.
 */
export function HeroCarousel({ items, interval = 8 }: { items: HeroItem[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length < 2 || interval <= 0) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % items.length), interval * 1000);
    return () => clearTimeout(t);
  }, [index, paused, items.length, interval]);

  if (items.length === 0) return null;
  const item = items[index];

  return (
    <section
      className="relative isolate flex min-h-[80svh] items-end overflow-hidden md:min-h-[90svh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carrossel"
    >
      {/* Fundo: banner do dorama (troca com fade) */}
      <div aria-hidden className="absolute inset-0 -z-10">
        {items.map((it, i) => (
          <div
            key={it.slug}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000",
              i === index ? "opacity-100" : "opacity-0",
            )}
          >
            <Artwork
              seed={it.artSeed}
              title={it.title}
              imageUrl={it.bannerUrl}
              variant="backdrop"
              priority={i === 0}
              className={i === index ? "animate-[hero-zoom_12s_ease-out_both]" : undefined}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/35 to-ink-950/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/25 to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-4 pb-16 sm:px-6 md:pb-28 lg:px-10">
        <div key={item.slug} className="animate-fade-up max-w-xl">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="brand">Em destaque</Badge>
            {item.categories.slice(0, 2).map((c) => (
              <Badge key={c}>{c}</Badge>
            ))}
          </div>

          <h1 className="font-display text-[2.6rem] leading-[0.95] font-extrabold tracking-tight uppercase sm:text-6xl lg:text-7xl">
            {item.title}
          </h1>
          <p className="text-gradient-brand mt-3 text-base font-bold sm:text-lg">{item.tagline}</p>

          <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm font-semibold text-fg-muted">
            <span>{item.year}</span>
            <span aria-hidden>·</span>
            <span>{item.episodes} episódios</span>
            <span aria-hidden>·</span>
            <span className="rounded border border-fg-subtle/60 px-1.5 text-xs leading-5">
              {item.ageRating === "L" ? "L" : `${item.ageRating}+`}
            </span>
          </p>

          <p className="mt-4 line-clamp-3 hidden text-[15px] leading-relaxed text-fg-muted sm:block">
            {item.synopsis}
          </p>

          <div className="mt-7 flex items-center gap-3">
            <ButtonLink
              href={item.firstEpisodeId ? `/assistir/${item.firstEpisodeId}` : `/dorama/${item.slug}`}
              size="lg"
              className="flex-1 sm:flex-none"
            >
              <Play className="fill-current" /> Assistir
            </ButtonLink>
            <MyListButton
              key={item.id}
              doramaId={item.id}
              initial={item.inMyList}
              size="lg"
              className="flex-1 sm:flex-none"
            />
            <Link
              href={`/dorama/${item.slug}`}
              aria-label="Mais informações"
              className="hidden h-13 w-13 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/20 sm:flex"
            >
              <Info className="size-5" />
            </Link>
          </div>
        </div>

        {/* Indicadores */}
        {items.length > 1 && (
          <div className="mt-8 flex gap-2">
            {items.map((it, i) => (
              <button
                key={it.slug}
                type="button"
                aria-label={`Destaque ${i + 1}: ${it.title}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  i === index ? "w-8 bg-brand-500" : "w-3 bg-white/30 hover:bg-white/50",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
