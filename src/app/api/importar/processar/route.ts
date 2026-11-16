/**
 * Processa a fila de importação por ~50 s. Chamado a cada minuto pelo
 * agendador do Supabase (pg_cron) com a senha IMPORT_TOKEN.
 */
import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { CATALOG_TAG } from "@/lib/catalog";
import { runImportWorker } from "@/lib/importer";

export const maxDuration = 60;

function tokenOk(req: NextRequest) {
  const expected = (process.env.IMPORT_TOKEN ?? "").trim();
  const given = (req.nextUrl.searchParams.get("token") ?? "").trim();
  return Boolean(expected) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

async function handle(req: NextRequest) {
  if (!tokenOk(req)) return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  try {
    const summary = await runImportWorker(48_000);
    if (summary.some((s) => s.result === "pronto")) revalidateTag(CATALOG_TAG, "max");
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
