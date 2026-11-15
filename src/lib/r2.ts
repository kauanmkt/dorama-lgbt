import "server-only";

/**
 * CLOUDFLARE R2 — onde ficam os vídeos.
 *
 * As chaves de acesso ficam só no servidor (variáveis da Vercel):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *
 * O navegador nunca recebe as chaves: o servidor gera links temporários
 * ("assinados") para enviar cada parte do vídeo ou para assistir.
 */
import { AwsClient } from "aws4fetch";

const accountId = process.env.R2_ACCOUNT_ID ?? "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? "";
const bucket = process.env.R2_BUCKET ?? "";

export const isR2Configured = Boolean(accountId && accessKeyId && secretAccessKey && bucket);

/** Tamanho de cada parte do envio (o R2 exige partes iguais, mínimo 5 MB). */
export const PART_SIZE = 50 * 1024 * 1024;

let client: AwsClient | undefined;
function r2() {
  if (!isR2Configured) throw new Error("O Cloudflare R2 ainda não foi configurado na Vercel.");
  client ??= new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  return client;
}

// R2_ENDPOINT só é usado nos testes automáticos (simulador local de S3)
const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;
const objectUrl = (key: string) => `${endpoint}/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;

async function call(url: string, init: RequestInit, what: string) {
  const res = await r2().fetch(url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const code = /<Code>([^<]+)<\/Code>/.exec(body)?.[1] ?? res.status;
    throw new Error(`R2 recusou ${what} (${code})`);
  }
  return res;
}

async function presign(url: string, method: "GET" | "PUT", expiresSec: number) {
  const u = new URL(url);
  u.searchParams.set("X-Amz-Expires", String(expiresSec));
  const signed = await r2().sign(new Request(u, { method }), { aws: { signQuery: true } });
  return signed.url;
}

// ---------------- Envio em partes (multipart) ----------------

export async function createMultipartUpload(key: string, contentType: string): Promise<string> {
  const res = await call(
    `${objectUrl(key)}?uploads`,
    { method: "POST", headers: { "content-type": contentType } },
    "iniciar o envio",
  );
  const uploadId = /<UploadId>([^<]+)<\/UploadId>/.exec(await res.text())?.[1];
  if (!uploadId) throw new Error("R2 não devolveu o identificador do envio.");
  return uploadId;
}

/** Links temporários (6 h) para enviar cada parte direto do navegador. */
export async function presignUploadParts(key: string, uploadId: string, parts: number): Promise<string[]> {
  return Promise.all(
    Array.from({ length: parts }, (_, i) =>
      presign(
        `${objectUrl(key)}?partNumber=${i + 1}&uploadId=${encodeURIComponent(uploadId)}`,
        "PUT",
        6 * 3600,
      ),
    ),
  );
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[],
) {
  const xml =
    "<CompleteMultipartUpload>" +
    [...parts]
      .sort((a, b) => a.partNumber - b.partNumber)
      .map((p) => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${escapeXml(p.etag)}</ETag></Part>`)
      .join("") +
    "</CompleteMultipartUpload>";
  const res = await call(
    `${objectUrl(key)}?uploadId=${encodeURIComponent(uploadId)}`,
    { method: "POST", body: xml, headers: { "content-type": "application/xml" } },
    "finalizar o envio",
  );
  // O R2 pode responder 200 com um erro dentro do XML
  const text = await res.text();
  if (text.includes("<Error>")) throw new Error(`R2 recusou finalizar o envio (${/<Code>([^<]+)/.exec(text)?.[1]})`);
}

export async function abortMultipartUpload(key: string, uploadId: string) {
  await call(`${objectUrl(key)}?uploadId=${encodeURIComponent(uploadId)}`, { method: "DELETE" }, "cancelar o envio");
}

// ---------------- Arquivos ----------------

/** Tamanho real do arquivo no R2 (confere que o envio chegou inteiro). */
export async function headObject(key: string): Promise<number | null> {
  const res = await r2().fetch(objectUrl(key), { method: "HEAD" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`R2 recusou consultar o arquivo (${res.status})`);
  return Number(res.headers.get("content-length") ?? 0);
}

export async function deleteObject(key: string) {
  const res = await r2().fetch(objectUrl(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`R2 recusou apagar o arquivo (${res.status})`);
}

/** Apaga vários arquivos sem interromper se algum falhar (limpeza). */
export async function deleteObjectsQuietly(keys: string[]) {
  if (!isR2Configured) return;
  await Promise.allSettled(keys.map(deleteObject));
}

/** Link temporário para assistir (só é gerado depois de conferir o acesso). */
export async function presignPlayback(key: string, expiresSec = 4 * 3600) {
  return presign(objectUrl(key), "GET", expiresSec);
}

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
