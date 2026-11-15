"use client";

/**
 * ENVIO DE IMAGENS (capas, banners) para o Storage do Supabase.
 *
 * Antes de enviar, a imagem é reduzida e convertida para WebP no próprio
 * navegador: uma capa de 5 MB vira ~150 KB, e o app carrega bem mais rápido
 * no celular. Só administradores conseguem enviar (regra no banco).
 */
import { isSupabaseConfigured } from "@/lib/supabase/config";

const LIMITS = {
  poster: { width: 800, height: 1200 },
  banner: { width: 1920, height: 1080 },
} as const;

export type ImageKind = keyof typeof LIMITS;

async function toWebp(file: File, kind: ImageKind): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width: maxW, height: maxH } = LIMITS[kind];
  const scale = Math.min(1, maxW / bitmap.width, maxH / bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  // Navegadores antigos sem WebP: envia o original
  return blob && blob.type === "image/webp" ? blob : file;
}

/** Envia a imagem e devolve o endereço público dela. */
export async function uploadImage(file: File, folder: string, kind: ImageKind): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem (JPG, PNG ou WebP).");
  if (file.size > 25 * 1024 * 1024) throw new Error("Imagem muito grande (máximo 25 MB).");

  // Modo demonstração: só mostra a prévia local
  if (!isSupabaseConfigured) return URL.createObjectURL(file);

  const blob = await toWebp(file, kind);
  const ext = blob.type === "image/webp" ? "webp" : (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${folder}/${kind}-${Date.now().toString(36)}.${ext}`;

  const { createBrowserSupabase } = await import("@/lib/supabase/browser");
  const supabase = createBrowserSupabase();
  const { error } = await supabase.storage
    .from("imagens")
    .upload(path, blob, { contentType: blob.type || file.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`Não foi possível enviar a imagem: ${error.message}`);
  return supabase.storage.from("imagens").getPublicUrl(path).data.publicUrl;
}
