import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Play, Share2 } from "lucide-react";
import { Artwork } from "@/components/catalog/Artwork";
import { DoramaCard } from "@/components/catalog/DoramaCard";
import { MyListButton } from "@/components/catalog/MyListButton";
import { Rail } from "@/components/catalog/Rail";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import {
  categoryNameFrom,
  doramaDuration,
  firstEpisode,
  getAllDoramas,
  getCategories,
  getContinueWatching,
  getDoramaBySlug,
  getRelatedDoramas,
  isInMyList,
  withPlaceholder,
} from "@/lib/catalog";
import { formatDuration } from "@/lib/format";
import type { Dorama, Episode } from "@/types/catalog";

export async function generateStaticParams() {
  return withPlaceholder((await getAllDoramas()).map((d) => ({ slug: d.slug })), "slug");
}

export async function generateMetadata({ params }: PageProps<"/dorama/[slug]">): Promise<Metadata> {
  const dorama = await getDoramaBySlug((await params).slug);
  return dorama ? { title: dorama.title, description: dorama.tagline } : {};
}

/** PÁGINA INDIVIDUAL DO DORAMA */
export default async function DoramaPage({ params }: PageProps<"/dorama/[slug]">) {
  const { slug } = await params;
  const dorama = await getDoramaBySlug(slug);
  if (!dorama) notFound();

  const [related, categories] = await Promise.all([getRelatedDoramas(dorama), getCategories()]);
  const duration = formatDuration(doramaDuration(dorama));

  return (
    <>
      {/* ===== Banner ===== */}
      <section className="relative isolate min-h-[62svh] overflow-hidden md:min-h-[78svh]">
        <div aria-hidden className="absolute inset-0 -z-10">
          <Artwork
            seed={dorama.artSeed}
            title={dorama.title}
            imageUrl={dorama.bannerUrl}
            variant="backdrop"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-ink-950/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/40 to-transparent" />
        </div>

        <div className="mx-auto flex min-h-[62svh] max-w-[1600px] items-end gap-8 px-4 pt-24 pb-10 sm:px-6 md:min-h-[78svh] md:pb-16 lg:px-10">
          {/* Capa (computador) */}
          <div className="hidden aspect-[2/3] w-56 shrink-0 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15 lg:block xl:w-64">
            <Artwork seed={dorama.artSeed} title={dorama.title} imageUrl={dorama.posterUrl} />
          </div>

          <div className="animate-fade-up max-w-2xl">
            <div className="mb-3 flex flex-wrap gap-2">
              {dorama.isNew && <Badge tone="brand">Novo</Badge>}
              <Badge tone={dorama.status === "em_exibicao" ? "success" : "neutral"}>
                {dorama.status === "em_exibicao" ? "Em exibição" : "Completo"}
              </Badge>
            </div>

            <h1 className="font-display text-4xl leading-[0.95] font-extrabold uppercase sm:text-5xl lg:text-6xl">
              {dorama.title}
            </h1>
            <p className="text-gradient-brand mt-3 text-base font-bold sm:text-lg">{dorama.tagline}</p>

            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-fg-muted">
              <span>{dorama.year}</span>
              <span aria-hidden>·</span>
              <span>{dorama.country}</span>
              <span aria-hidden>·</span>
              {duration && (
                <>
                  <span>{duration}</span>
                  <span aria-hidden>·</span>
                </>
              )}
              <span className="rounded border border-fg-subtle/60 px-1.5 text-xs leading-5">
                {dorama.ageRating === "L" ? "L" : `${dorama.ageRating}+`}
              </span>
            </p>

            {/* Botões: o estado pessoal (Continuar / Minha Lista) carrega em seguida */}
            <Suspense fallback={<WatchActions dorama={dorama} start={firstEpisode(dorama)} inList={false} />}>
              <UserWatchActions dorama={dorama} />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ===== Sinopse e informações ===== */}
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16">
          <div className="space-y-10">
            <section>
              <h2 className="sr-only">Sinopse</h2>
              <p className="max-w-3xl text-[15px] leading-relaxed text-fg-muted sm:text-base">
                {dorama.synopsis}
              </p>
            </section>

          </div>

          <aside className="space-y-6 text-sm lg:pt-1">
            <InfoRow label="Categorias">
              <div className="flex flex-wrap gap-2">
                {dorama.categories.map((c) => (
                  <Link key={c} href={`/categoria/${c}`}>
                    <Badge tone="brand" className="hover:bg-brand-600/35">
                      {categoryNameFrom(categories, c)}
                    </Badge>
                  </Link>
                ))}
              </div>
            </InfoRow>
            {dorama.originalTitle && <InfoRow label="Título original">{dorama.originalTitle}</InfoRow>}
            <InfoRow label="País">{dorama.country}</InfoRow>
            <InfoRow label="Ano">{dorama.year}</InfoRow>
            {duration && <InfoRow label="Duração">{duration}</InfoRow>}
            <InfoRow label="Classificação">
              {dorama.ageRating === "L" ? "Livre" : `Não recomendado para menores de ${dorama.ageRating}`}
            </InfoRow>
          </aside>
        </div>
      </div>

      {/* ===== Recomendações ===== */}
      {related.length > 0 && (
        <div className="mt-14">
          <Rail title="Você também pode gostar">
            {related.map((d) => (
              <DoramaCard key={d.slug} dorama={d} />
            ))}
          </Rail>
        </div>
      )}
    </>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold tracking-wider text-fg-subtle uppercase">{label}</p>
      <div className="font-semibold text-fg">{children}</div>
    </div>
  );
}

/** Botões com o estado da pessoa: "Continuar" (se já começou) e Minha Lista. */
async function UserWatchActions({ dorama }: { dorama: Dorama }) {
  const [continuing, inList] = await Promise.all([getContinueWatching(50), isInMyList(dorama)]);
  const resume = continuing.find((c) => c.dorama.slug === dorama.slug);
  return (
    <WatchActions
      dorama={dorama}
      start={resume?.episode ?? firstEpisode(dorama)}
      resumePercent={resume?.percent}
      inList={inList}
    />
  );
}

function WatchActions({
  dorama,
  start,
  resumePercent,
  inList,
}: {
  dorama: Dorama;
  start?: Episode;
  resumePercent?: number;
  inList: boolean;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      {start ? (
        <ButtonLink
          href={`/assistir/${start.id}`}
          size="lg"
          className="relative flex-1 overflow-hidden sm:flex-none"
        >
          <Play className="fill-current" />
          {resumePercent ? "Continuar" : "Assistir"}
          {resumePercent ? (
            <span className="absolute inset-x-0 bottom-0 h-1 bg-black/25">
              <span className="block h-full bg-white/80" style={{ width: `${resumePercent}%` }} />
            </span>
          ) : null}
        </ButtonLink>
      ) : (
        <span className="flex h-13 flex-1 items-center justify-center rounded-full bg-white/10 px-7 font-semibold text-fg-muted sm:flex-none">
          Em breve
        </span>
      )}
      <MyListButton key={String(inList)} doramaId={dorama.id} initial={inList} size="lg" className="flex-1 sm:flex-none" />
      <button
        type="button"
        aria-label="Compartilhar"
        className="hidden h-13 w-13 items-center justify-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/20 sm:flex"
      >
        <Share2 className="size-5" />
      </button>
    </div>
  );
}
