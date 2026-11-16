/**
 * Recebe a lista de doramas do catálogo antigo e monta a fila de importação.
 * Formato: [[id, título, capa, playlist, pedaços, duração], ...]
 * Só links públicos (capa e vídeo) — nenhuma senha ou login passa por aqui.
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cleanTitle, detectCategories } from "@/lib/import-rules";
import { createAdminClient } from "@/lib/supabase/admin";

function tokenOk(req: NextRequest) {
  const expected = (process.env.IMPORT_TOKEN ?? "").trim();
  const given = (req.nextUrl.searchParams.get("token") ?? "").trim();
  return Boolean(expected) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

type Item = [string, string, string | null, string | null, number, number];

export async function POST(req: NextRequest) {
  if (!tokenOk(req)) return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  let items: Item[];
  try {
    items = JSON.parse(await req.text());
    if (!Array.isArray(items)) throw new Error();
  } catch {
    return NextResponse.json({ error: "Lista inválida" }, { status: 400 });
  }

  const seen = new Map<string, number>();
  const rows = items
    .filter(([id, title, , video]) => id && title && video && /^https:\/\//.test(video))
    .map(([id, rawTitle, cover, video, segs]) => {
      const hint = `${rawTitle} ${cover ?? ""} ${video ?? ""}`;
      const dub = /dublad/i.test(hint);
      const title = cleanTitle(rawTitle) + (dub ? " (Dublado)" : "");
      const key = title.toLowerCase();
      // Repetidos: fica o de mais pedaços (vídeo mais completo)
      const prev = seen.get(key);
      const duplicate = prev !== undefined && prev >= segs;
      if (!duplicate) seen.set(key, segs);
      return {
        source: "cinedrama",
        source_id: id,
        title,
        title_original: rawTitle.trim(),
        cover_url: cover,
        source_url: video as string,
        categories: [...new Set(detectCategories(hint))],
        status: "pendente",
        _key: key,
        _segs: segs,
      };
    });

  // Marca como "ignorado" os repetidos que perderam para uma versão maior
  const best = new Map<string, string>();
  for (const r of rows) {
    const cur = best.get(r._key);
    const curSegs = rows.find((x) => x.source_id === cur)?._segs ?? -1;
    if (!cur || r._segs > curSegs) best.set(r._key, r.source_id);
  }
  const payload = rows.map(({ _key, ...r }) => ({
    ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== "_segs")),
    status: best.get(_key) === r.source_id ? "pendente" : "ignorado",
  }));

  const admin = createAdminClient();
  const { error } = await admin
    .from("imports")
    .upsert(payload, { onConflict: "source,source_id", ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    recebidos: items.length,
    na_fila: payload.filter((p) => p.status === "pendente").length,
    repetidos: payload.filter((p) => p.status === "ignorado").length,
  });
}
