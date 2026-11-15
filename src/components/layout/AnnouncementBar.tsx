"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";

/**
 * Aviso definido no painel (Configurações → "Aviso no topo do app").
 * Aparece como um balão discreto; a pessoa pode fechar e ele só volta
 * quando o texto do aviso mudar.
 */
export function AnnouncementBar({ text }: { text: string }) {
  const storageKey = `aviso:${text}`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let closed = false;
    try {
      closed = localStorage.getItem(storageKey) === "fechado";
    } catch {
      // navegador sem armazenamento: mostra sempre
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depende do armazenamento do navegador
    if (!closed) setVisible(true);
  }, [storageKey]);

  if (!visible) return null;

  const close = () => {
    setVisible(false);
    try {
      localStorage.setItem(storageKey, "fechado");
    } catch {}
  };

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-ink-850/95 py-2.5 pr-2 pl-4 text-sm shadow-2xl ring-1 ring-brand-500/40 backdrop-blur-xl md:bottom-6"
    >
      <Megaphone className="size-4 shrink-0 text-brand-300" />
      <p className="min-w-0 flex-1 font-semibold">{text}</p>
      <button
        type="button"
        onClick={close}
        aria-label="Fechar aviso"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:bg-white/10 hover:text-fg"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
