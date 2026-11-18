import { Suspense } from "react";
import { EnablePushBanner } from "@/components/notifications/EnablePushBanner";
import { ContinueCard } from "@/components/catalog/ContinueCard";
import { DoramaCard } from "@/components/catalog/DoramaCard";
import { HeroCarousel, type HeroItem } from "@/components/catalog/HeroCarousel";
import { getPublicSetting } from "@/lib/settings";
import { formatDuration } from "@/lib/format";
import { Rail } from "@/components/catalog/Rail";
import { TopCard } from "@/components/catalog/TopCard";
import {
  categoryNameFrom,
  doramaDuration,
  firstEpisode,
  getCategories,
  getContinueWatching,
  getDoramasByCategory,
  getFeaturedDoramas,
  getMyList,
  getNewReleases,
  getTopDoramas,
} from "@/lib/catalog";

/**
 * PÁGINA INICIAL — montada a partir do catálogo, sem nada fixo no código.
 * As partes iguais para todos vêm do cache (rápido); as fileiras pessoais
 * (Continuar assistindo, Minha lista) carregam em seguida, para cada usuário.
 */
export default async function HomePage() {
  const [featured, releases, top, categories] = await Promise.all([
    getFeaturedDoramas(),
    getNewReleases(),
    getTopDoramas(10),
    getCategories(),
  ]);

  const categoryRails = (
    await Promise.all(
      categories.map(async (c) => ({ category: c, doramas: await getDoramasByCategory(c.slug) })),
    )
  ).filter((r) => r.doramas.length >= 3); // fileiras com poucos títulos ficam de fora

  const heroItems: HeroItem[] = featured.map((d) => ({
    id: d.id,
    slug: d.slug,
    title: d.title,
    tagline: d.tagline,
    synopsis: d.synopsis,
    year: d.year,
    ageRating: d.ageRating,
    categories: d.categories.map((c) => categoryNameFrom(categories, c)),
    duration: formatDuration(doramaDuration(d)),
    artSeed: d.artSeed,
    bannerUrl: d.bannerUrl,
    posterUrl: d.posterUrl,
    firstEpisodeId: firstEpisode(d)?.id,
    inMyList: false,
  }));

  const rotation = await getPublicSetting<number>("hero_rotation_s");
  const heroInterval = typeof rotation === "number" ? rotation : 8;

  const isEmpty = featured.length === 0 && releases.length === 0 && top.length === 0;

  return (
    <>
      {heroItems.length > 0 ? <HeroCarousel items={heroItems} interval={heroInterval} /> : <div className="h-24" />}

      <div className={heroItems.length > 0 ? "relative z-10 -mt-10 space-y-8 md:-mt-16 md:space-y-10" : "space-y-8"}>
        <EnablePushBanner className="mx-4 sm:mx-6 lg:mx-10" />

        <Suspense fallback={null}>
          <ContinueWatchingRail />
        </Suspense>

        <Rail title="Lançamentos" href="/doramas">
          {releases.map((d) => (
            <DoramaCard key={d.slug} dorama={d} />
          ))}
        </Rail>

        <Rail
          title="Top 10 no Amora"
          itemClassName="w-[52%] sm:w-[34%] md:w-[26%] lg:w-[20.5%] 2xl:w-[16.5%]"
        >
          {top.map((d, i) => (
            <TopCard key={d.slug} dorama={d} rank={i + 1} />
          ))}
        </Rail>

        <Suspense fallback={null}>
          <MyListRail />
        </Suspense>

        {categoryRails.map(({ category, doramas }) => (
          <Rail key={category.slug} title={category.name} href={`/categoria/${category.slug}`}>
            {doramas.map((d) => (
              <DoramaCard key={d.slug} dorama={d} />
            ))}
          </Rail>
        ))}

        {isEmpty && (
          <div className="mx-4 rounded-2xl border border-dashed border-line px-6 py-20 text-center sm:mx-6 lg:mx-10">
            <p className="font-display text-xl font-bold">O catálogo está sendo preparado</p>
            <p className="mt-2 text-fg-muted">Em breve, novos doramas por aqui.</p>
          </div>
        )}
      </div>
    </>
  );
}

async function ContinueWatchingRail() {
  const items = await getContinueWatching();
  if (items.length === 0) return null;
  return (
    <Rail title="Continuar assistindo">
      {items.map((c) => (
        <ContinueCard key={c.episode.id} dorama={c.dorama} episode={c.episode} percent={c.percent} />
      ))}
    </Rail>
  );
}

async function MyListRail() {
  const list = await getMyList();
  if (list.length === 0) return null;
  return (
    <Rail title="Minha lista" href="/minha-lista">
      {list.map((d) => (
        <DoramaCard key={d.slug} dorama={d} />
      ))}
    </Rail>
  );
}
