import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, SubPage } from "@/components/account/SubPage";
import { getMyAccess, getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ScreensList, type ScreenRow } from "./ScreensList";

export const metadata: Metadata = { title: "Telas conectadas" };

export default function ScreensPage() {
  return (
    <SubPage
      title="Telas conectadas"
      description="Aparelhos assistindo agora. Se o limite do seu plano estiver cheio, desconecte um deles para assistir em outro."
    >
      <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-ink-850" />}>
        <ScreensContent />
      </Suspense>
    </SubPage>
  );
}

async function ScreensContent() {
  const access = await getMyAccess();
  const rows = await loadScreens();
  return (
    <>
      <Card>
        <p className="text-sm text-fg-muted">
          Seu plano permite{" "}
          <strong className="text-fg">
            {access.screens || 1} {(access.screens || 1) === 1 ? "tela" : "telas"}
          </strong>{" "}
          assistindo ao mesmo tempo. Uma tela fica livre sozinha quando o vídeo é fechado.
        </p>
      </Card>
      <ScreensList rows={rows} />
    </>
  );
}

/** Telas com sinal nos últimos 90 s. */
async function loadScreens(): Promise<ScreenRow[]> {
  if (!isSupabaseConfigured || !(await getSessionUser())) return [];
  const { createSessionClient } = await import("@/lib/supabase/server");
  const supabase = await createSessionClient();
  const since = new Date(Date.now() - 90_000).toISOString();
  const { data } = await supabase
    .from("playback_sessions")
    .select("id, device_id, user_agent, last_heartbeat_at, episodes(seasons(doramas(title)))")
    .gte("last_heartbeat_at", since)
    .order("last_heartbeat_at", { ascending: false });
  return (data ?? []).map((r) => {
    const ep = r.episodes as unknown as { seasons: { doramas: { title: string } | null } | null } | null;
    return { id: r.id, deviceId: r.device_id, userAgent: r.user_agent, watching: ep?.seasons?.doramas?.title ?? null };
  });
}
