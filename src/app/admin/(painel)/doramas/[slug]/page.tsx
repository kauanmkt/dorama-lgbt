import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DoramaEditor, type VideoMap } from "@/components/admin/doramas/DoramaEditor";
import { getAdminCategories, getAdminDorama, getAdminDoramas, getVideos } from "@/lib/admin";

export async function generateStaticParams() {
  return (await getAdminDoramas()).map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/admin/doramas/[slug]">): Promise<Metadata> {
  const d = await getAdminDorama((await params).slug);
  return { title: d ? `Editar · ${d.title}` : "Editar dorama" };
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

  return <DoramaEditor initial={dorama} categories={categories} videos={videoMap} />;
}
