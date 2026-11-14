import type { Metadata } from "next";
import { Suspense } from "react";
import { Bookmark } from "lucide-react";
import { DoramaGrid } from "@/components/catalog/DoramaGrid";
import { Container, PageIntro } from "@/components/layout/PageIntro";
import { ButtonLink } from "@/components/ui/Button";
import { getMyList } from "@/lib/catalog";

export const metadata: Metadata = { title: "Minha Lista" };

export default function MyListPage() {
  return (
    <Container className="pt-24 md:pt-28">
      <PageIntro title="Minha Lista" description="Os doramas que você salvou para assistir depois." />
      <Suspense fallback={<GridSkeleton />}>
        <MyList />
      </Suspense>
    </Container>
  );
}

async function MyList() {
  const list = await getMyList();
  if (list.length > 0) return <DoramaGrid doramas={list} />;
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/15 text-brand-300">
        <Bookmark className="size-6" />
      </span>
      <p className="font-display mt-4 text-lg font-bold">Sua lista está vazia</p>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">
        Toque em “Minha Lista” na página de um dorama para salvá-lo aqui.
      </p>
      <ButtonLink href="/doramas" className="mt-6">
        Explorar catálogo
      </ButtonLink>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-ink-800" />
      ))}
    </div>
  );
}
