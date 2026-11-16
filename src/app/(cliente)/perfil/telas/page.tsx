import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, SubPage } from "@/components/account/SubPage";
import { ExternalLink, Plus } from "lucide-react";
import { getMyAccess, getSessionUser } from "@/lib/auth";
import { getPublicSetting } from "@/lib/settings";
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
  const [access, { rows, current }, upgradeUrl, user] = await Promise.all([
    getMyAccess(),
    loadScreens(),
    getPublicSetting<string>("upgrade_url"),
    getSessionUser(),
  ]);
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
      {upgradeUrl?.trim() && (
        <div className="rounded-2xl border border-brand-500/40 bg-gradient-to-br from-brand-900/60 to-ink-900 p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-600">
              <Plus className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold">Quer usar em mais aparelhos ao mesmo tempo?</p>
              <p className="mt-1 text-sm text-fg-muted">
                Adicione telas ao seu plano. Cada tela extra libera mais um aparelho conectado, sem derrubar os outros.
              </p>
              {user?.email && (
                <p className="mt-2 text-sm text-fg-muted">
                  No pagamento, use o mesmo e-mail da sua conta:{" "}
                  <strong className="break-all text-fg">{user.email}</strong>
                </p>
              )}
            </div>
          </div>
          <a
            href={upgradeUrl.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 text-sm font-bold transition hover:bg-brand-500"
          >
            Adicionar telas <ExternalLink className="size-4" aria-hidden="true" />
          </a>
          <p className="mt-2 text-center text-xs text-fg-subtle">A tela nova é liberada assim que o pagamento for aprovado.</p>
        </div>
      )}
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
