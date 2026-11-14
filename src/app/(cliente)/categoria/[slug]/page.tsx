import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DoramaGrid } from "@/components/catalog/DoramaGrid";
import { Container, PageIntro } from "@/components/layout/PageIntro";
import { getCategories, getCategory, getDoramasByCategory, withPlaceholder } from "@/lib/catalog";

export async function generateStaticParams() {
  return withPlaceholder((await getCategories()).map((c) => ({ slug: c.slug })), "slug");
}

export async function generateMetadata({ params }: PageProps<"/categoria/[slug]">): Promise<Metadata> {
  const c = await getCategory((await params).slug);
  return c ? { title: c.name } : {};
}

export default async function CategoryPage({ params }: PageProps<"/categoria/[slug]">) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const doramas = await getDoramasByCategory(slug);

  return (
    <Container className="pt-24 md:pt-28">
      <PageIntro eyebrow="Categoria" title={category.name} description={category.description} />
      {doramas.length > 0 ? (
        <DoramaGrid doramas={doramas} />
      ) : (
        <p className="text-fg-muted">Nenhum título nesta categoria ainda.</p>
      )}
    </Container>
  );
}
