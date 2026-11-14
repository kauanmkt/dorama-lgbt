import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Clock } from "lucide-react";
import { PlayerShell } from "@/components/player/PlayerShell";
import {
  getAllEpisodeIds,
  getContinueWatching,
  getEpisode,
  withPlaceholder,
  type EpisodeContext,
} from "@/lib/catalog";

export async function generateStaticParams() {
  return withPlaceholder((await getAllEpisodeIds()).map((id) => ({ id })), "id");
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

  if (!ctx.episode.available) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/15 text-brand-300">
          <Clock className="size-6" />
        </span>
        <h1 className="text-2xl font-extrabold">Episódio em breve</h1>
        <p className="max-w-sm text-fg-muted">
          {ctx.dorama.title} · T{ctx.episode.season}:E{ctx.episode.number} ainda não está disponível.
        </p>
        <Link
          href={`/dorama/${ctx.dorama.slug}`}
          className="mt-2 inline-flex items-center gap-2 font-semibold text-brand-300 hover:text-brand-200"
        >
          <ArrowLeft className="size-4" /> Voltar para {ctx.dorama.title}
        </Link>
      </div>
    );
  }

  // O player aparece na hora; o ponto onde a pessoa parou chega logo em seguida
  return (
    <Suspense fallback={<Player ctx={ctx} />}>
      <PlayerWithProgress ctx={ctx} />
    </Suspense>
  );
}

async function PlayerWithProgress({ ctx }: { ctx: EpisodeContext }) {
  const progress = (await getContinueWatching(50)).find((c) => c.episode.id === ctx.episode.id);
  return <Player ctx={ctx} startPercent={progress?.percent} />;
}

function Player({ ctx, startPercent }: { ctx: EpisodeContext; startPercent?: number }) {
  const pick = ({ id, season, number, title, durationMin }: EpisodeContext["episode"]) => ({
    id,
    season,
    number,
    title,
    durationMin,
  });
  return (
    <PlayerShell
      key={startPercent ?? "inicio"}
      doramaSlug={ctx.dorama.slug}
      doramaTitle={ctx.dorama.title}
      artSeed={ctx.dorama.artSeed}
      episode={pick(ctx.episode)}
      next={ctx.next ? pick(ctx.next) : undefined}
      startPercent={startPercent}
    />
  );
}
