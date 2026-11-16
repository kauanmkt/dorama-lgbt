"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Botão "Instalar agora" (aparece no Android/Chrome quando o navegador permite). */
export function InstallButton() {
  const [event, setEvent] = useState<PromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as PromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- detecta se já está aberto como app
      setInstalled(true);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <p className="rounded-2xl border border-success/30 bg-success/10 p-4 text-sm font-semibold text-success">
        O app já está instalado neste aparelho.
      </p>
    );
  }
  if (!event) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        await event.prompt();
        await event.userChoice;
        setEvent(null);
      }}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-4 text-[15px] font-bold transition hover:bg-brand-500"
    >
      <Download className="size-5" /> Instalar agora
    </button>
  );
}
