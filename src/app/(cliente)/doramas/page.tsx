import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { Container, PageIntro } from "@/components/layout/PageIntro";
import { getAllDoramas, getCategories } from "@/lib/catalog";

export const metadata: Metadata = { title: "Doramas" };

export default async function DoramasPage() {
  const [doramas, categories] = await Promise.all([getAllDoramas(), getCategories()]);
  return (
    <Container className="pt-24 md:pt-28">
      <PageIntro
        eyebrow="Catálogo"
        title="Todos os doramas"
        description="Explore o catálogo completo e filtre por categoria."
      />
      <CatalogBrowser doramas={doramas} categories={categories} />
    </Container>
  );
}
