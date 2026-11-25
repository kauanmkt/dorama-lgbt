"use client";

import { useEffect, useRef, useState } from "react";
import { Gift, X } from "lucide-react";
import { CheckoutLink } from "./CheckoutLink";
import { useVisitor } from "./visitor-store";

const SHOWN_KEY = "amora:downsell";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * DOWNSELL DE SAÍDA (só no /cadastro, só para visitante, 1 vez por visita).
 * Abre quando a pessoa tenta voltar (botão voltar do celular) ou leva o
 * mouse para fechar a aba (computador).
 */
export function ExitDownsell({
  offerUrl,
  offerCents,
  fromCents,
}: {
  offerUrl: string;
  offerCents: number;
  fromCents?: number;
}) {
  const { visitor } = useVisitor();
  const [open, setOpen] = useState(false);
  const armed = useRef(false);

  useEffect(() => {
    if (!visitor) return;
    let shown = false;
    try {
      shown = sessionStorage.getItem(SHOWN_KEY) === "1";
    } catch {}
    if (shown) return;

    const show = () => {
      if (armed.current) return;
      armed.current = true;
      try {
        sessionStorage.setItem(SHOWN_KEY, "1");
      } catch {}
      setOpen(true);
    };

    // Celular: uma "parada" extra no histórico — o primeiro "voltar" abre a oferta
    const state = window.history.state ?? {};
    window.history.pushState(
      { ...state, __amoraDownsell: true },
      "",
      window.location.href,
    );
    const onPop = () => show();
    window.addEventListener("popstate", onPop);

    // Computador: mouse saindo pela parte de cima da janela
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0) show();
    };
    // espera um pouco para não disparar assim que a página abre
    const t = setTimeout(
      () => document.addEventListener("mouseout", onOut),
      4000,
    );

    return () => {
      clearTimeout(t);
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("mouseout", onOut);
    };
  }, [visitor]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      data-plans-sheet
      role="dialog"
      aria-modal="true"
      aria-label="Oferta especial"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => setOpen(false)}
        className="animate-fade-in absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <div className="animate-fade-up relative w-full max-w-sm overflow-hidden rounded-[28px] border border-brand-400/50 bg-[rgb(20_10_28)] p-6 text-center shadow-[0_0_90px_-20px] shadow-brand-500">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fechar"
          className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-white/5 text-fg-muted hover:bg-white/10 hover:text-fg"
        >
          <X className="size-5" />
        </button>
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500">
          <Gift className="size-8" aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs font-extrabold tracking-[0.2em] text-brand-300 uppercase">
          Espera! Antes de ir…
        </p>
        <h2 className="mt-1 text-2xl leading-tight font-extrabold">
          Um desconto só pra você
        </h2>
        <p className="mt-2 text-sm text-fg-muted">
          Plano Mensal com todo o catálogo liberado:
        </p>
        <div className="mt-3 flex items-end justify-center gap-3">
          {fromCents && fromCents > offerCents && (
            <span className="pb-1 text-lg text-fg-subtle line-through">
              {brl(fromCents)}
            </span>
          )}
          <span className="font-display text-5xl leading-none font-extrabold">
            {brl(offerCents)}
          </span>
        </div>
        <p className="mt-1 text-xs text-fg-subtle">
          por 30 dias · oferta válida só agora
        </p>
        <CheckoutLink
          href={offerUrl}
          className="mt-5 flex h-13 items-center justify-center rounded-full bg-brand-600 py-3.5 text-base font-extrabold transition hover:bg-brand-500"
        >
          Quero por {brl(offerCents)}
        </CheckoutLink>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-3 text-xs text-fg-subtle underline-offset-2 hover:underline"
        >
          Não, obrigado
        </button>
      </div>
    </div>
  );
}
