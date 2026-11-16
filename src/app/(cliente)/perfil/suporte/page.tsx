import type { Metadata } from "next";
import { Suspense } from "react";
import { SubPage } from "@/components/account/SubPage";
import { ChatView } from "@/components/support/ChatView";
import { enviarMensagem, minhasMensagens } from "@/lib/support-actions";

export const metadata: Metadata = { title: "Falar com o suporte" };

export default function SupportPage() {
  return (
    <SubPage title="Falar com o suporte" description="Mande sua dúvida aqui. A resposta aparece nesta mesma conversa.">
      <Suspense fallback={<div className="h-[60vh] animate-pulse rounded-2xl bg-ink-850" />}>
        <Chat />
      </Suspense>
    </SubPage>
  );
}

async function Chat() {
  const initial = await minhasMensagens();
  return (
    <ChatView
      initial={initial}
      me="cliente"
      load={minhasMensagens}
      send={enviarMensagem}
      emptyText="Olá! 👋 Conte o que aconteceu e a gente te responde por aqui."
      className="h-[calc(100dvh-15rem)] min-h-[380px]"
    />
  );
}
