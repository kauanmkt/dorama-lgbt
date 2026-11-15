"use server";

/**
 * ENVIO DE VÍDEOS (painel) — Cloudflare R2.
 *
 * 1. iniciarEnvio: o servidor confere se é admin, abre um envio em partes no R2
 *    e devolve links temporários, um para cada parte.
 * 2. O navegador envia as partes DIRETO para o R2 (não passa pela Vercel).
 * 3. concluirEnvio: o servidor fecha o envio, confere o tamanho, registra o
 *    vídeo no banco e o episódio passa a ficar disponível no site.
 */
import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Fail = { ok: false; error: string };
type Ok<T = object> = { ok: true; message?: string } & T;

const MAX_SIZE = 20 * 1024 * 1024 * 1024; // 20 GB por arquivo
const NOT_CONFIGURED: Fail = {
  ok: false,
  error: "O armazenamento de vídeos (Cloudflare R2) ainda não foi configurado na Vercel.",
};

async function guard() {
  if (!isSupabaseConfigured) return { ok: false, error: "Modo demonstração: o envio é simulado." } as Fail;
  await requireAdmin();
  const r2 = await import("@/lib/r2");
  if (!r2.isR2Configured) return NOT_CONFIGURED;
  return r2;
}

const message = (e: unknown) => (e instanceof Error ? e.message : "Erro inesperado no envio.");

export type StartedUpload = { key: string; uploadId: string; partSize: number; urls: string[] };

export async function iniciarEnvio(input: {
  fileName: string;
  size: number;
  contentType: string;
}): Promise<Ok<StartedUpload> | Fail> {
  const r2 = await guard();
  if ("ok" in r2) return r2;
  if (!(input.size > 0) || input.size > MAX_SIZE) return { ok: false, error: "Arquivo vazio ou maior que 20 GB." };

  const ext = (/\.([a-z0-9]{2,4})$/i.exec(input.fileName)?.[1] ?? "mp4").toLowerCase();
  if (!["mp4", "m4v", "mov", "webm"].includes(ext)) {
    return { ok: false, error: "Formato não aceito. Envie MP4 (recomendado), M4V, MOV ou WEBM." };
  }
  const contentType = input.contentType.startsWith("video/") ? input.contentType : "video/mp4";
  const key = `videos/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
  try {
    const uploadId = await r2.createMultipartUpload(key, contentType);
    const parts = Math.max(1, Math.ceil(input.size / r2.PART_SIZE));
    const urls = await r2.presignUploadParts(key, uploadId, parts);
    return { ok: true, key, uploadId, partSize: r2.PART_SIZE, urls };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function concluirEnvio(input: {
  key: string;
  uploadId: string;
  parts: { partNumber: number; etag: string }[];
  episodeId: string;
  fileName: string;
  size: number;
  durationSec?: number;
}): Promise<Ok | Fail> {
  const r2 = await guard();
  if ("ok" in r2) return r2;
  if (!/^videos\/[0-9-]+\/[0-9a-f-]+\.[a-z0-9]+$/.test(input.key)) return { ok: false, error: "Envio inválido." };

  try {
    await r2.completeMultipartUpload(input.key, input.uploadId, input.parts);
    const stored = await r2.headObject(input.key);
    if (stored === null || stored !== input.size) {
      await r2.deleteObjectsQuietly([input.key]);
      return { ok: false, error: "O arquivo chegou incompleto no R2. Tente enviar de novo." };
    }
  } catch (e) {
    return { ok: false, error: message(e) };
  }

  const { createSessionClient } = await import("@/lib/supabase/server");
  const supabase = await createSessionClient();
  const { data: previous } = await supabase
    .from("videos")
    .select("storage_key")
    .eq("episode_id", input.episodeId)
    .maybeSingle();

  const { error } = await supabase.from("videos").upsert(
    {
      episode_id: input.episodeId,
      storage_key: input.key,
      file_name: input.fileName.slice(0, 200),
      size_bytes: input.size,
      duration_sec: input.durationSec ? Math.round(input.durationSec) : null,
      format: "mp4",
      status: "pronto",
      uploaded_at: new Date().toISOString(),
    },
    { onConflict: "episode_id" },
  );
  if (error) {
    await r2.deleteObjectsQuietly([input.key]);
    return {
      ok: false,
      error: error.message.includes("foreign key")
        ? "Esse episódio não existe mais. Salve o dorama e tente de novo."
        : error.message,
    };
  }
  // A duração do vídeo passa a ser a duração exibida no site
  if (input.durationSec) {
    await supabase
      .from("episodes")
      .update({ duration_min: Math.max(1, Math.round(input.durationSec / 60)) })
      .eq("id", input.episodeId);
  }
  // O vídeo antigo (se foi substituído) é apagado do R2
  if (previous?.storage_key && previous.storage_key !== input.key) {
    await r2.deleteObjectsQuietly([previous.storage_key]);
  }

  updateTag(CATALOG_TAG);
  return { ok: true, message: "Vídeo enviado — episódio liberado no site" };
}

export async function cancelarEnvio(input: { key: string; uploadId: string }): Promise<Ok | Fail> {
  const r2 = await guard();
  if ("ok" in r2) return r2;
  try {
    await r2.abortMultipartUpload(input.key, input.uploadId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function excluirVideo(episodeId: string): Promise<Ok | Fail> {
  if (!isSupabaseConfigured) return { ok: true, message: "Modo demonstração: nada foi apagado." };
  await requireAdmin();
  const { createSessionClient } = await import("@/lib/supabase/server");
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("videos")
    .delete()
    .eq("episode_id", episodeId)
    .select("storage_key");
  if (error) return { ok: false, error: error.message };
  const { deleteObjectsQuietly } = await import("@/lib/r2");
  await deleteObjectsQuietly((data ?? []).map((v) => v.storage_key));
  updateTag(CATALOG_TAG);
  return { ok: true, message: "Vídeo excluído — episódio volta a aparecer como “Em breve”" };
}
