/**
 * Rotina de notificações (lançamentos, continuar assistindo, saudade).
 * Chamada pelo agendador do Supabase a cada 15 min, com o token da rotina.
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runNotificationJobs } from "@/lib/notification-jobs";

export const maxDuration = 60;

function tokenOk(req: NextRequest) {
  const expected = (process.env.IMPORT_TOKEN ?? "").trim();
  const given = (req.nextUrl.searchParams.get("token") ?? "").trim();
  return Boolean(expected) && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export async function GET(req: NextRequest) {
  if (!tokenOk(req)) return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await runNotificationJobs()) });
  } catch (e) {
    console.error("[notificacoes]", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "erro" }, { status: 500 });
  }
}
