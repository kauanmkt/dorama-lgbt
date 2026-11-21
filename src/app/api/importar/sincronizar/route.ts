/**
 * Procura doramas LGBT novos no catálogo antigo e põe na fila de importação.
 * Chamado pelo agendador do Supabase (a cada 30 min) com o token de importação.
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { syncCinedrama } from "@/lib/sync-cinedrama";

export const maxDuration = 60;

function tokenOk(req: NextRequest) {
  const expected = (process.env.IMPORT_TOKEN ?? "").trim();
  const given = (req.nextUrl.searchParams.get("token") ?? "").trim();
  return Boolean(expected) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function GET(req: NextRequest) {
  if (!tokenOk(req)) return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  try {
    // (não limpa o cache aqui: o dorama só aparece quando a cópia termina, e aí o copiador limpa)
    const result = await syncCinedrama();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[sincronizar]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erro" }, { status: 502 });
  }
}
