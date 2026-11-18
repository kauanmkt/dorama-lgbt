"use client";

import { useEffect, useState } from "react";
import { BellRing, Download, MoreVertical, Share, SquarePlus, X, Zap } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "amora:install-prompt";
const WAIT_DAYS = 3; // fechou: volta a aparecer depois de 3 dias
const DELAY_MS = 4000; // espera a pessoa ver a página antes de aparecer

type Platform = "ios" | "android" | null;

function detect(): Platform {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return "ios";
  if (/Android/i.test(ua)) return "android";
  return null; // computador: não mostra
}

const standalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

/** Alerta "Baixe o app" para quem usa a Amora pelo navegador do celular. */
export function InstallPrompt() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [event, setEvent] = useState<PromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // guarda para mostrar no nosso botão
      setEvent(e as PromptEvent);
    };
    const onInstalled = () => setOpen(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const p = detect();
    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    } catch {}
    if (p && !standalone() && Date.now() - dismissedAt > WAIT_DAYS * 86_400_000) {
      timer = setTimeout(() => {
        setPlatform(p);
        setOpen(true);
      }, DELAY_MS);
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setOpen(false);
  };

  if (!open || !platform) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="install-title">
      <button type="button" aria-label="Fechar" className="absolute inset-0 cursor-default" onClick={close} />
      <div className="pb-safe relative w-full max-w-md rounded-t-3xl border-t border-white/10 bg-ink-900 px-6 pt-6 shadow-2xl">
        <button
          type="button"
          onClick={close}
          aria-label="Agora não"
          className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full text-fg-muted hover:bg-white/10 hover:text-fg"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-4">
          <LogoMark className="h-14 w-14 rounded-2xl" />
          <div>
            <h2 id="install-title" className="text-xl font-extrabold">
              Baixe o app da Amora
            </h2>
            <p className="text-sm text-fg-muted">Grátis e não ocupa espaço no celular.</p>
          </div>
        </div>

        <ul className="mt-5 space-y-2.5 text-sm">
          <li className="flex items-center gap-3">
            <Zap className="size-4 shrink-0 text-brand-300" aria-hidden="true" /> Abre direto da tela inicial, em tela cheia
          </li>
          <li className="flex items-center gap-3">
            <BellRing className="size-4 shrink-0 text-brand-300" aria-hidden="true" /> Avisos quando chegar dorama novo
          </li>
          <li className="flex items-center gap-3">
            <Download className="size-4 shrink-0 text-brand-300" aria-hidden="true" /> Sem loja de apps: instala em segundos
          </li>
        </ul>

        {platform === "android" && event ? (
          <button
            type="button"
            onClick={async () => {
              await event.prompt();
              const choice = await event.userChoice.catch(() => ({ outcome: "dismissed" }));
              setEvent(null);
              if (choice.outcome === "accepted") setOpen(false);
            }}
            className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3.5 font-bold transition hover:bg-brand-500"
          >
            <Download className="size-5" aria-hidden="true" /> Instalar agora
          </button>
        ) : (
          <ol className="mt-6 space-y-3 rounded-2xl bg-ink-800 p-4 text-sm">
            {platform === "ios" ? (
              <>
                <li className="flex items-center gap-3">
                  <Step n={1} /> Toque em <Share className="size-5 shrink-0 text-sky-400" aria-label="Compartilhar" />
                  <span>
                    <strong>Compartilhar</strong>, na barra do Safari
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Step n={2} /> <SquarePlus className="size-5 shrink-0" aria-hidden="true" />
                  <span>
                    <strong>Adicionar à Tela de Início</strong>
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Step n={3} />
                  <span>
                    Toque em <strong>Adicionar</strong>. Pronto!
                  </span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-center gap-3">
                  <Step n={1} /> Toque em <MoreVertical className="size-5 shrink-0" aria-label="menu" />
                  <span>no canto de cima do navegador</span>
                </li>
                <li className="flex items-center gap-3">
                  <Step n={2} />
                  <span>
                    <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Step n={3} />
                  <span>
                    Confirme em <strong>Instalar</strong>. Pronto!
                  </span>
                </li>
              </>
            )}
          </ol>
        )}

        <button type="button" onClick={close} className="mt-2 mb-4 h-12 w-full rounded-full text-sm font-bold text-fg-muted hover:text-fg">
          Agora não
        </button>
      </div>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold" aria-hidden="true">
      {n}
    </span>
  );
}
