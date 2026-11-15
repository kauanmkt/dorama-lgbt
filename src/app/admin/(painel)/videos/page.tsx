import type { Metadata } from "next";
import { VideosManager, type EpisodeRow } from "@/components/admin/VideosManager";
import { getAdminDoramas, getVideos } from "@/lib/admin";
import { NOW } from "@/lib/format";
import { isR2Configured } from "@/lib/r2";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Vídeos" };

export default async function AdminVideosPage() {
  const [doramas, videos] = await Promise.all([getAdminDoramas(), getVideos()]);
  const byEpisode = new Map(videos.map((v) => [v.episodeId, v]));

  const rows: EpisodeRow[] = doramas.flatMap((d) =>
    d.seasons.flatMap((s) =>
      s.episodes.map((e): EpisodeRow => {
        const v = byEpisode.get(e.id);
        return {
          episodeId: e.id,
          doramaTitle: d.title,
          doramaSlug: d.slug,
          season: s.number,
          number: e.number,
          title: e.title,
          video: v && {
            key: v.key,
            fileName: v.fileName,
            sizeBytes: v.sizeBytes,
            status: v.status === "processando" ? "processando" : "pronto",
            uploadedAt: v.uploadedAt,
          },
        };
      }),
    ),
  );

  // Episódios sem vídeo primeiro
  rows.sort((a, b) => Number(Boolean(a.video)) - Number(Boolean(b.video)));

  return (
    <>
      {isSupabaseConfigured && !isR2Configured && (
        <p className="mb-6 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning ring-1 ring-warning/25">
          <strong>Falta configurar:</strong> o armazenamento de vídeos (Cloudflare R2) ainda não está ligado
          na Vercel. Os envios vão falhar até as chaves do R2 serem cadastradas.
        </p>
      )}
      <VideosManager initial={rows} now={(isSupabaseConfigured ? new Date() : NOW).toISOString()} />
    </>
  );
}
