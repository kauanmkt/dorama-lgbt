import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, SubPage } from "@/components/account/SubPage";
import { getMyAccess } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ScreensList, type ScreenRow } from "./ScreensList";

export const metadata: Metadata = { title: "Telas conectadas" };

export default function ScreensPage() {
  return (
    <SubPage
      title="Telas conectadas"
      description="Aparelhos com a sua conta logada agora. Ao entrar num aparelho novo além do limite, o mais antigo é desconectado sozinho."
    >
      <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-ink-850" />}>
        <ScreensContent />
      </Suspense>
    </SubPage>
  );
}

async function ScreensContent() {
  const [access, { rows, current }] = await Promise.all([getMyAccess(), loadScreens()]);
  const screens = access.screens || 1;
  return (
    <>
      <Card>
        <p className="text-sm text-fg-muted">
          Seu plano permite{" "}
          <strong className="text-fg">
            {screens} {screens === 1 ? "aparelho conectado" : "aparelhos conectados"}
          </strong>{" "}
          ao mesmo tempo. Se a conta entrar em mais um, o login mais antigo sai automaticamente.
        </p>
      </Card>
      <ScreensList rows={rows} current={current} />
    </>
  );
}

/** Logins ativos da própria pessoa (o banco só mostra os dela). */
async function loadScreens(): Promise<{ rows: ScreenRow[]; current: string | null }> {
  if (!isSupabaseConfigured) return { rows: [], current: null };
  const { createSessionClient } = await import("@/lib/supabase/server");
  const supabase = await createSessionClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { rows: [], current: null };
  const current = String((claims.claims as Record<string, unknown>).session_id ?? "") || null;
  // registra este aparelho caso ainda não esteja na lista
  await supabase.rpc("session_touch", { p_agent: null });
  const { data } = await supabase
    .from("login_sessions")
    .select("session_id, user_agent, created_at, last_seen_at")
    .order("created_at", { ascending: false });
  return {
    current,
    rows: (data ?? []).map((r) => ({
      id: r.session_id,
      userAgent: r.user_agent,
      since: r.created_at,
      lastSeen: r.last_seen_at,
    })),
  };
}
