import type { Metadata } from "next";
import { Suspense } from "react";
import { SubPage } from "@/components/account/SubPage";
import { PushSettings } from "@/components/notifications/PushSettings";
import { minhasPreferencias } from "@/lib/notification-actions";

export const metadata: Metadata = { title: "Notificações" };

export default function NotificationSettingsPage() {
  return (
    <SubPage title="Notificações" description="Saiba na hora quando chegar dorama novo e nunca perca onde parou.">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-ink-850" />}>
        <Content />
      </Suspense>
    </SubPage>
  );
}

async function Content() {
  const prefs = await minhasPreferencias();
  return <PushSettings initialPrefs={prefs} />;
}
