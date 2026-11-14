import { ContinueCard } from "@/components/catalog/ContinueCard";
import { DoramaCard } from "@/components/catalog/DoramaCard";
import { HeroCarousel, type HeroItem } from "@/components/catalog/HeroCarousel";
import { Rail } from "@/components/catalog/Rail";
import { TopCard } from "@/components/catalog/TopCard";
import {
  categoryName,
  episodeCount,
  firstEpisode,
  getCategories,
  getContinueWatching,
  getDoramasByCategory,
  getFeaturedDoramas,
  getMyList,
  getNewReleases,
  getTopDoramas,
} from "@/lib/catalog";

/** PÁGINA INICIAL — tudo aqui é montado a partir do catálogo, sem nada fixo no código. */
export default async function HomePage() {
  const [featured, continueWatching, myList, releases, top, categories] = await Promise.all([
    getFeaturedDoramas(),
    getContinueWatching(),
    getMyList(),
    getNewReleases(),
    getTopDoramas(10),
    getCategories(),
  ]);
  const myListSlugs = new Set(myList.map((d) => d.slug));

  // Trilhos por categoria (só os que têm conteúdo)
  const categoryRails = (
    await Promise.all(
      categories.map(async (c) => ({ category: c, doramas: await getDoramasByCategory(c.slug) })),
    )
  ).filter((r) => r.doramas.length >= 3); // trilhos com poucos títulos ficam de fora

  const heroItems: HeroItem[] = featured.map((d) => ({
    slug: d.slug,
    title: d.title,
    tagline: d.tagline,
    synopsis: d.synopsis,
    year: d.year,
    ageRating: d.ageRating,
    categories: d.categories.map(categoryName),
    episodes: episodeCount(d),
    artSeed: d.artSeed,
    bannerUrl: d.bannerUrl,
    firstEpisodeId: firstEpisode(d)?.id,
    inMyList: myListSlugs.has(d.slug),
  }));

  return (
    <>
      <HeroCarousel items={heroItems} />

      <div className="relative z-10 -mt-10 space-y-8 md:-mt-16 md:space-y-10">
        {continueWatching.length > 0 && (
          <Rail
            title="Continuar assistindo"
            itemClassName="w-[72%] sm:w-[44%] md:w-[31%] lg:w-[23.6%] 2xl:w-[19%]"
          >
            {continueWatching.map((c) => (
              <ContinueCard
                key={c.episode.id}
                dorama={c.dorama}
                episode={c.episode}
                percent={c.percent}
              />
            ))}
          </Rail>
        )}

        <Rail title="Lançamentos" href="/doramas">
          {releases.map((d) => (
            <DoramaCard key={d.slug} dorama={d} />
          ))}
        </Rail>

        <Rail
          title="Top 10 no Dorama LGBT"
          itemClassName="w-[52%] sm:w-[34%] md:w-[26%] lg:w-[20.5%] 2xl:w-[16.5%]"
        >
          {top.map((d, i) => (
            <TopCard key={d.slug} dorama={d} rank={i + 1} />
          ))}
        </Rail>

        {myList.length > 0 && (
          <Rail title="Minha lista" href="/minha-lista">
            {myList.map((d) => (
              <DoramaCard key={d.slug} dorama={d} />
            ))}
          </Rail>
        )}

        {categoryRails.map(({ category, doramas }) => (
          <Rail key={category.slug} title={category.name} href={`/categoria/${category.slug}`}>
            {doramas.map((d) => (
              <DoramaCard key={d.slug} dorama={d} />
            ))}
          </Rail>
        ))}
      </div>
    </>
  );
}
