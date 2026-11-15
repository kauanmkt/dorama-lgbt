import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DoramaEditor, type VideoMap } from "@/components/admin/doramas/DoramaEditor";
import { getAdminCategories, getAdminDorama, getVideos } from "@/lib/admin";
import { hashString } from "@/lib/format";

export const metadata: Metadata = { title: "Editar dorama" };

// Página sempre montada na hora (com os dados mais recentes do banco).
export async function generateStaticParams() {
  return [{ slug: "_" }];
}

export default async function EditDoramaPage({ params }: PageProps<"/admin/doramas/[slug]">) {
  const { slug } = await params;
  const [dorama, categories, videos] = await Promise.all([
    getAdminDorama(slug),
    getAdminCategories(),
    getVideos(),
  ]);
  if (!dorama) notFound();

  const episodeIds = new Set(dorama.seasons.flatMap((s) => s.episodes.map((e) => e.id)));
  const videoMap: VideoMap = Object.fromEntries(
    videos
      .filter((v) => episodeIds.has(v.episodeId))
      .map((v) => [
        v.episodeId,
        { name: v.fileName, size: v.sizeBytes, status: v.status === "processando" ? "processando" : "pronto" },
      ]),
  );

  // A "chave" muda quando os dados mudam no servidor, recarregando o editor
  const version = hashString(JSON.stringify([dorama.updatedAt, dorama.seasons, videoMap]));
  return <DoramaEditor key={version} initial={dorama} categories={categories} videos={videoMap} />;
}
