"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { getPushState } from "@/lib/push-client";

const DISMISS_KEY = "amora:push-banner";

/**
 * Convite para ativar as notificações. Some quando já estão ativas,
 * bloqueadas ou quando a pessoa fecha (volta depois de 7 dias).
 */
export function EnablePushBanner({ className = "" }: { className?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    } catch {}
    if (Date.now() - dismissedAt < 7 * 86_400_000) return;
    getPushState()
      .then((s) => setShow(s === "desligado")) // iPhone sem o app: o alerta de instalar cuida disso
      .catch(() => {});
  }, []);

  if (!show) return null;

  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-brand-500/40 bg-gradient-to-r from-brand-900/70 to-ink-900 p-3.5 pr-2 ${className}`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-600">
        <BellRing className="size-5" aria-hidden="true" />
      </span>
      <Link href="/perfil/notificacoes" className="min-w-0 flex-1">
        <p className="text-sm font-bold">Ative as notificações</p>
        <p className="text-xs text-fg-muted">Saiba na hora quando chegar dorama novo.</p>
      </Link>
      <Link href="/perfil/notificacoes" className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold hover:bg-brand-500">
        Ativar
      </Link>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
          } catch {}
          setShow(false);
        }}
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-white/10 hover:text-fg"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
