import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Artwork } from "@/components/catalog/Artwork";
import { Container, PageIntro } from "@/components/layout/PageIntro";
import { getCategories, getDoramasByCategory } from "@/lib/catalog";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  const categories = await getCategories();
  const withCounts = await Promise.all(
    categories.map(async (c) => {
      const doramas = await getDoramasByCategory(c.slug);
      return { ...c, count: doramas.length, cover: doramas[0] };
    }),
  );

  return (
    <Container className="pt-24 md:pt-28">
      <PageIntro eyebrow="Explorar" title="Categorias" description="Encontre a sua próxima história." />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {withCounts.map((c, i) => (
          <Link
            key={c.slug}
            href={`/categoria/${c.slug}`}
            className="group relative isolate flex aspect-[16/10] flex-col justify-end overflow-hidden rounded-2xl p-4 ring-1 ring-white/10 transition hover:ring-brand-500/70 sm:p-5"
          >
            <div className="absolute inset-0 -z-10 transition-transform duration-500 group-hover:scale-105">
              <Artwork seed={c.cover?.artSeed ?? i} title={c.name} imageUrl={c.cover?.bannerUrl} fallbackUrl={c.cover?.posterUrl} variant="backdrop" />
            </div>
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <p className="font-display text-2xl font-extrabold sm:text-3xl">{c.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-white/75 sm:text-sm">
              {c.count} {c.count === 1 ? "título" : "títulos"}
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
            </p>
          </Link>
        ))}
      </div>
    </Container>
  );
}
