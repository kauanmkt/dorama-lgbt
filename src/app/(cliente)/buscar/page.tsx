import type { Metadata } from "next";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { Container, PageIntro } from "@/components/layout/PageIntro";
import { getAllDoramas, getCategories } from "@/lib/catalog";

export const metadata: Metadata = { title: "Buscar" };

export default async function SearchPage() {
  const [doramas, categories] = await Promise.all([getAllDoramas(), getCategories()]);
  return (
    <Container className="pt-24 md:pt-28">
      <PageIntro title="Buscar" className="mb-5" />
      <CatalogBrowser doramas={doramas} categories={categories} withSearch autoFocus />
    </Container>
  );
}
