/**
 * PLAYLIST DE VÍDEO HLS (vídeos importados, divididos em pedaços).
 *
 * Confere se a pessoa está logada e com acesso ativo e devolve a playlist
 * com um link temporário (4 h) para cada pedaço no R2. Sem acesso, nada.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getMyAccess, isAdmin } from "@/lib/auth";
import { getObjectText, isR2Configured, presignPlayback } from "@/lib/r2";
import { createAdminClient } from "@/lib/supabase/admin";

/** Este login ainda vale? (pode ter sido derrubado por outro aparelho) */
async function sessionAlive() {
  const { createSessionClient } = await import("@/lib/supabase/server");
  const { data, error } = await (await createSessionClient()).rpc("session_alive");
  return error ? true : data === true;
}

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/hls/[episodeId]">) {
  const { episodeId } = await ctx.params;
  if (!isR2Configured || !/^[0-9a-f-]{36}$/.test(episodeId)) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  const [access, admin, alive] = await Promise.all([getMyAccess(), isAdmin(), sessionAlive()]);
  if (!alive) return new NextResponse("Login encerrado em outro aparelho", { status: 401 });
  if (!access.hasAccess && !admin) return new NextResponse("Sem acesso", { status: 403 });

  const { data: video } = await createAdminClient()
    .from("videos")
    .select("storage_key, format")
    .eq("episode_id", episodeId)
    .eq("status", "pronto")
    .maybeSingle();
  if (!video || !video.storage_key.endsWith(".m3u8")) return new NextResponse("Não encontrado", { status: 404 });

  const folder = video.storage_key.slice(0, video.storage_key.lastIndexOf("/") + 1);
  const original = await getObjectText(video.storage_key);
  const lines = await Promise.all(
    original.split(/\r?\n/).map(async (line) => {
      const t = line.trim();
      if (!t || t.startsWith("#")) return line;
      return presignPlayback(`${folder}${t}`, 4 * 3600);
    }),
  );

  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "application/vnd.apple.mpegurl",
      "cache-control": "private, no-store",
    },
  });
}
