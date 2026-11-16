import "server-only";

/**
 * SINCRONIZAÇÃO AUTOMÁTICA COM O CATÁLOGO ANTIGO (CineDrama).
 *
 * Chamada pelo agendador do Supabase a cada 30 min. Lê a lista pública de
 * títulos do site antigo, pega os da seção LGBT que ainda não vieram e põe
 * na fila de importação. O copiador (importer.ts) faz o resto: copia capa e
 * vídeo para o nosso R2 e publica o dorama.
 *
 * Só usa dados públicos: a lista de títulos e os links públicos de capa/vídeo.
 */
import { cleanTitle, detectCategories } from "@/lib/import-rules";
import { createAdminClient } from "@/lib/supabase/admin";

const CATALOG_URL = "https://cinedramatv.site/api/filmes.php";
const COVER_RE = /^https:\/\/cdn\.lownotas\.com\.br\/capas\/([^/?#]+)\.(?:jpe?g|png|webp)$/i;

type SourceItem = {
  id: string;
  titulo: string;
  categoria: string | null;
  capa: string | null;
  tipo_video: string | null;
  created_at: string | null;
};

export type SyncResult = { lgbt: number; novos: number; na_fila: number; ignorados: number; titulos: string[] };

/** O vídeo dos títulos novos fica numa pasta com o mesmo nome da capa. */
export function videoFromCover(cover: string | null): string | null {
  const m = cover?.trim().match(COVER_RE);
  return m ? `https://cdn.lownotas.com.br/videos/${m[1]}/index.m3u8` : null;
}

export async function syncCinedrama(): Promise<SyncResult> {
  const res = await fetch(CATALOG_URL, { signal: AbortSignal.timeout(30_000), cache: "no-store" });
  if (!res.ok) throw new Error(`Catálogo antigo respondeu ${res.status}`);
  const all = (await res.json()) as SourceItem[];
  if (!Array.isArray(all)) throw new Error("Catálogo antigo em formato inesperado");

  const lgbt = all.filter((x) => x?.id && x.titulo && /lgbt/i.test(x.categoria ?? ""));
  const admin = createAdminClient();

  const [{ data: known, error: e1 }, { data: doramas, error: e2 }] = await Promise.all([
    admin.from("imports").select("source_id, title, status").eq("source", "cinedrama"),
    admin.from("doramas").select("title"),
  ]);
  if (e1 || e2) throw new Error((e1 ?? e2)!.message);

  const knownIds = new Set((known ?? []).map((k) => k.source_id));
  const takenTitles = new Set(
    [...(known ?? []).filter((k) => k.status !== "ignorado").map((k) => k.title), ...(doramas ?? []).map((d) => d.title)].map(
      (t) => t.toLowerCase().trim(),
    ),
  );

  const fresh = lgbt.filter((x) => !knownIds.has(x.id));
  const rows = fresh.map((x) => {
    const hint = `${x.titulo} ${x.capa ?? ""}`;
    const dub = /dublad/i.test(hint);
    const title = cleanTitle(x.titulo) + (dub ? " (Dublado)" : "");
    const video = videoFromCover(x.capa);
    const repeated = takenTitles.has(title.toLowerCase());
    if (!repeated) takenTitles.add(title.toLowerCase());
    return {
      source: "cinedrama",
      source_id: x.id,
      title,
      title_original: x.titulo.trim(),
      cover_url: x.capa?.trim() || null,
      source_url: video ?? x.capa?.trim() ?? "",
      categories: [...new Set(detectCategories(hint))],
      status: !video || repeated ? "ignorado" : "pendente",
      error: !video
        ? `Vídeo não disponível para cópia automática (tipo ${x.tipo_video ?? "?"})`
        : repeated
          ? "Já existe um dorama com este nome"
          : null,
    };
  });

  if (rows.length) {
    const { error } = await admin.from("imports").upsert(rows, { onConflict: "source,source_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  await admin
    .from("settings")
    .upsert({ key: "import_last_sync", value: { at: new Date().toISOString(), novos: rows.length }, is_public: false });

  const queued = rows.filter((r) => r.status === "pendente");
  return {
    lgbt: lgbt.length,
    novos: rows.length,
    na_fila: queued.length,
    ignorados: rows.length - queued.length,
    titulos: queued.map((r) => r.title),
  };
}
