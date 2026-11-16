import "server-only";

/**
 * COPIADOR DO CATÁLOGO ANTIGO.
 *
 * Chamado a cada minuto (pelo agendador do Supabase). Em cada chamada:
 *  1. pega o próximo dorama da fila "imports";
 *  2. na primeira vez: copia a capa, cria o dorama (rascunho) e conta os pedaços do vídeo;
 *  3. copia os pedaços (.ts) do vídeo HLS para o R2, 8 de cada vez, até acabar o tempo;
 *  4. quando termina: grava a playlist, registra o vídeo e PUBLICA o dorama.
 * Se cair no meio, a próxima chamada continua de onde parou.
 */
import { slugify } from "@/lib/format";
import { getObjectText, isR2Configured, putObject } from "@/lib/r2";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

type Job = {
  id: string;
  title: string;
  title_original: string;
  cover_url: string | null;
  source_url: string;
  categories: string[];
  status: string;
  dorama_id: string | null;
  storage_prefix: string | null;
  segments_total: number;
  segments_done: number;
  bytes_copied: number;
  attempts: number;
};

const PARALLEL = 8;

async function get(url: string, ms = 25_000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms), cache: "no-store" });
  if (!res.ok) throw new Error(`Origem respondeu ${res.status} para ${url}`);
  return res;
}

type Playlist = { lines: string[]; segments: { index: number; line: number; url: string }[]; duration: number };

function parsePlaylist(text: string, base: string): Playlist {
  const lines = text.split(/\r?\n/);
  const segments: Playlist["segments"] = [];
  let duration = 0;
  lines.forEach((l, i) => {
    const t = l.trim();
    if (t.startsWith("#EXTINF:")) duration += parseFloat(t.slice(8)) || 0;
    if (t && !t.startsWith("#")) segments.push({ index: segments.length, line: i, url: new URL(t, base).href });
  });
  if (lines.some((l) => l.startsWith("#EXT-X-STREAM-INF"))) throw new Error("Playlist principal sem variante escolhida");
  if (lines.some((l) => l.startsWith("#EXT-X-KEY") && !l.includes("METHOD=NONE"))) throw new Error("Vídeo criptografado");
  return { lines, segments, duration: Math.round(duration) };
}

/** Cria o dorama (rascunho) com a capa copiada para o nosso Storage. */
async function createDorama(admin: Admin, job: Job, durationSec: number): Promise<string> {
  let posterUrl: string | null = null;
  if (job.cover_url) {
    try {
      const res = await get(job.cover_url);
      const type = res.headers.get("content-type") ?? "image/jpeg";
      const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
      const path = `doramas/importados/${job.id}.${ext}`;
      const { error } = await admin.storage
        .from("imagens")
        .upload(path, await res.arrayBuffer(), { contentType: type, upsert: true, cacheControl: "31536000" });
      if (!error) posterUrl = admin.storage.from("imagens").getPublicUrl(path).data.publicUrl;
    } catch {
      // sem capa: o site mostra a arte automática
    }
  }

  const base = slugify(job.title).slice(0, 70).replace(/-+$/, "") || "dorama";
  let doramaId: string | null = null;
  for (let n = 1; n <= 20 && !doramaId; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (slug === "novo") continue;
    const { data, error } = await admin
      .from("doramas")
      .insert({
        slug,
        title: job.title.slice(0, 120),
        synopsis: "",
        tagline: "",
        country: "",
        visibility: "rascunho",
        is_new: true,
        art_seed: Math.floor(Math.random() * 40),
        poster_url: posterUrl,
      })
      .select("id")
      .single();
    if (!error) doramaId = data.id;
    else if (!error.message.includes("doramas_slug_key")) throw new Error(error.message);
  }
  if (!doramaId) throw new Error("Não foi possível criar um endereço único para o dorama");

  const { data: season, error: sErr } = await admin
    .from("seasons")
    .insert({ dorama_id: doramaId, number: 1 })
    .select("id")
    .single();
  if (sErr) throw new Error(sErr.message);
  const { error: eErr } = await admin.from("episodes").insert({
    season_id: season.id,
    number: 1,
    title: job.title.slice(0, 120),
    duration_min: Math.max(1, Math.round(durationSec / 60)),
  });
  if (eErr) throw new Error(eErr.message);

  if (job.categories.length) {
    const { data: cats } = await admin.from("categories").select("id, slug").in("slug", job.categories);
    if (cats?.length) {
      await admin.from("dorama_categories").insert(cats.map((c) => ({ dorama_id: doramaId, category_id: c.id })));
    }
  }
  return doramaId;
}

/** Se for a playlist principal (várias qualidades), escolhe a melhor. */
async function mediaPlaylist(url: string): Promise<{ text: string; url: string }> {
  const text = await (await get(url)).text();
  if (!text.includes("#EXT-X-STREAM-INF")) return { text, url };
  const lines = text.split(/\r?\n/);
  let best: { url: string; bw: number } | null = null;
  lines.forEach((l, i) => {
    if (!l.startsWith("#EXT-X-STREAM-INF")) return;
    const bw = Number(/BANDWIDTH=(\d+)/.exec(l)?.[1] ?? 0);
    const next = lines[i + 1]?.trim();
    if (next && (!best || bw > best.bw)) best = { url: new URL(next, url).href, bw };
  });
  if (!best) throw new Error("Playlist principal sem qualidades");
  const chosen = (best as { url: string }).url;
  return { text: await (await get(chosen)).text(), url: chosen };
}

async function processJob(admin: Admin, job: Job, deadline: number) {
  const media = await mediaPlaylist(job.source_url);
  const playlist = parsePlaylist(media.text, media.url);
  if (playlist.segments.length === 0) throw new Error("Playlist sem pedaços de vídeo");

  const prefix = job.storage_prefix ?? `hls/${job.id}`;
  let doramaId = job.dorama_id;
  if (!doramaId) {
    doramaId = await createDorama(admin, job, playlist.duration);
    await admin
      .from("imports")
      .update({
        status: "copiando",
        dorama_id: doramaId,
        storage_prefix: prefix,
        segments_total: playlist.segments.length,
        duration_sec: playlist.duration,
      })
      .eq("id", job.id);
  }

  let done = job.segments_done;
  let bytes = Number(job.bytes_copied);
  while (done < playlist.segments.length) {
    if (Date.now() > deadline) return "parcial";
    const batch = playlist.segments.slice(done, done + PARALLEL);
    const sizes = await Promise.all(
      batch.map(async (seg) => {
        for (let attempt = 1; ; attempt++) {
          try {
            const buf = await (await get(seg.url)).arrayBuffer();
            await putObject(`${prefix}/s${seg.index}.ts`, buf, "video/mp2t");
            return buf.byteLength;
          } catch (e) {
            if (attempt >= 3) throw e;
            await new Promise((r) => setTimeout(r, 800 * attempt));
          }
        }
      }),
    );
    done += batch.length;
    bytes += sizes.reduce((a, b) => a + b, 0);
    await admin
      .from("imports")
      .update({
        segments_done: done,
        bytes_copied: bytes,
        locked_until: new Date(Date.now() + 75_000).toISOString(),
      })
      .eq("id", job.id);
  }

  // Playlist com os nomes novos dos pedaços
  const lines = [...playlist.lines];
  for (const seg of playlist.segments) lines[seg.line] = `s${seg.index}.ts`;
  if (!lines.some((l) => l.startsWith("#EXT-X-ENDLIST"))) lines.push("#EXT-X-ENDLIST");
  const key = `${prefix}/index.m3u8`;
  await putObject(key, lines.join("\n"), "application/vnd.apple.mpegurl");
  await getObjectText(key); // confere que gravou

  const { data: episode } = await admin
    .from("episodes")
    .select("id, seasons!inner(dorama_id)")
    .eq("seasons.dorama_id", doramaId)
    .order("number")
    .limit(1)
    .single();
  if (!episode) throw new Error("Episódio do dorama não encontrado");

  const { error: vErr } = await admin.from("videos").upsert(
    {
      episode_id: episode.id,
      storage_key: key,
      file_name: `${job.title_original}.m3u8`.slice(0, 200),
      size_bytes: bytes,
      duration_sec: playlist.duration,
      format: "hls",
      status: "pronto",
      uploaded_at: new Date().toISOString(),
    },
    { onConflict: "episode_id" },
  );
  if (vErr) throw new Error(vErr.message);

  await admin.from("doramas").update({ visibility: "publicado" }).eq("id", doramaId);
  await admin
    .from("imports")
    .update({ status: "pronto", locked_until: null, error: null, bytes_copied: bytes, segments_done: done })
    .eq("id", job.id);
  return "pronto";
}

/** Trabalha até acabar o tempo; devolve um resumo do que fez. */
export async function runImportWorker(budgetMs = 50_000) {
  if (!isR2Configured) throw new Error("R2 não configurado");
  const admin = createAdminClient();
  const deadline = Date.now() + budgetMs;
  const summary: { title: string; result: string }[] = [];

  while (Date.now() < deadline - 3_000) {
    const { data, error } = await admin.rpc("claim_import");
    if (error) throw new Error(error.message);
    const job = (data as Job[] | null)?.[0];
    if (!job) break;
    try {
      const result = await processJob(admin, job, deadline);
      summary.push({ title: job.title, result });
      if (result === "parcial") break;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const attempts = job.attempts + 1;
      await admin
        .from("imports")
        .update({ attempts, error: message.slice(0, 500), locked_until: null, ...(attempts >= 8 ? { status: "erro" } : {}) })
        .eq("id", job.id);
      summary.push({ title: job.title, result: `erro: ${message}` });
    }
  }
  return summary;
}
