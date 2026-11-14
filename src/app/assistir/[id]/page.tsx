import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlayerShell } from "@/components/player/PlayerShell";
import { getAllEpisodeIds, getContinueWatching, getEpisode } from "@/lib/catalog";

export async function generateStaticParams() {
  return (await getAllEpisodeIds()).map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/assistir/[id]">): Promise<Metadata> {
  const ctx = await getEpisode((await params).id);
  return ctx
    ? { title: `${ctx.dorama.title} · T${ctx.episode.season}:E${ctx.episode.number}` }
    : {};
}

/** TELA DO PLAYER — ocupa a tela inteira, sem cabeçalho nem menus. */
export default async function WatchPage({ params }: PageProps<"/assistir/[id]">) {
  const { id } = await params;
  const ctx = await getEpisode(id);
  if (!ctx) notFound();

  const progress = (await getContinueWatching()).find((c) => c.episode.id === id);
  const pick = ({ id, season, number, title, durationMin }: typeof ctx.episode) => ({
    id,
    season,
    number,
    title,
    durationMin,
  });

  return (
    <PlayerShell
      doramaSlug={ctx.dorama.slug}
      doramaTitle={ctx.dorama.title}
      artSeed={ctx.dorama.artSeed}
      episode={pick(ctx.episode)}
      next={ctx.next ? pick(ctx.next) : undefined}
      startPercent={progress?.percent}
    />
  );
}
