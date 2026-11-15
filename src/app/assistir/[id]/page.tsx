import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Clock, Loader2, Lock, Wrench } from "lucide-react";
import { PlayerShell } from "@/components/player/PlayerShell";
import { getMyAccess, isAdmin } from "@/lib/auth";
import { getPlaybackSource } from "@/lib/playback";
import { getPublicSetting } from "@/lib/settings";
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

  // Confere o acesso no servidor antes de abrir o player
  return (
    <Suspense fallback={<Loading />}>
      <PlayerGate ctx={ctx} />
    </Suspense>
  );
}

async function PlayerGate({ ctx }: { ctx: EpisodeContext }) {
  const [access, maintenance] = await Promise.all([getMyAccess(), getPublicSetting<boolean>("maintenance")]);
  if (maintenance && !(await isAdmin())) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/15 text-brand-300">
          <Wrench className="size-6" />
        </span>
        <h1 className="text-2xl font-extrabold">Estamos em manutenção</h1>
        <p className="max-w-sm text-fg-muted">
          Estamos melhorando a plataforma. Volte em alguns minutos para continuar assistindo.
        </p>
        <Link href="/" className="text-sm font-semibold text-brand-300 hover:text-brand-200">
          Voltar ao início
        </Link>
      </div>
    );
  }
  if (!access.hasAccess) {
    const purchaseUrl = await getPublicSetting<string>("purchase_url");
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/15 text-warning">
          <Lock className="size-6" />
        </span>
        <h1 className="text-2xl font-extrabold">
          {access.status === "suspensa" ? "Acesso suspenso" : "Sua assinatura não está ativa"}
        </h1>
        <p className="max-w-sm text-fg-muted">
          {access.status === "suspensa"
            ? "Fale com o suporte para reativar sua conta."
            : "Renove sua assinatura para continuar assistindo."}
        </p>
        {purchaseUrl && access.status !== "suspensa" && (
          <a href={purchaseUrl} className="rounded-full bg-brand-600 px-6 py-3 font-bold hover:bg-brand-500">
            Renovar agora
          </a>
        )}
        <Link href="/perfil" className="text-sm font-semibold text-fg-muted hover:text-fg">
          Ver meu plano
        </Link>
      </div>
    );
  }
  const [progress, source, autoplay] = await Promise.all([
    getContinueWatching(50).then((list) => list.find((c) => c.episode.id === ctx.episode.id)),
    getPlaybackSource(ctx.episode.id),
    getPublicSetting<boolean>("autoplay_next"),
  ]);
  return <Player ctx={ctx} startPercent={progress?.percent} src={source?.url} autoplayNext={autoplay !== false} />;
}

function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <Loader2 className="size-8 animate-spin text-brand-400" />
    </div>
  );
}

function Player({
  ctx,
  startPercent,
  src,
  autoplayNext,
}: {
  ctx: EpisodeContext;
  startPercent?: number;
  src?: string;
  autoplayNext: boolean;
}) {
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
      src={src}
      autoplayNext={autoplayNext}
    />
  );
}
