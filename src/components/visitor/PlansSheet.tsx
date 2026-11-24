"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Check, Crown, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import type { SitePlan } from "@/lib/site-plans";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

function period(days: number | null) {
  if (!days) return "pagamento único";
  if (days >= 360) return "por ano";
  if (days >= 85 && days <= 95) return "por 3 meses";
  if (days >= 28 && days <= 31) return "por mês";
  return `por ${days} dias`;
}

function perMonth(p: SitePlan) {
  if (!p.durationDays || p.durationDays < 60) return null;
  const months = Math.round(p.durationDays / 30);
  return `equivale a ${brl(Math.round(p.priceCents / months))}/mês`;
}

const PERKS = [
  "Todo o catálogo liberado",
  "Lançamentos toda semana",
  "Assista no celular e no computador",
];

/** Janela "Escolha seu plano" (de baixo para cima no celular, centralizada no computador). */
export function PlansSheet({
  plans,
  open,
  onClose,
}: {
  plans: SitePlan[];
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      data-plans-sheet
      role="dialog"
      aria-modal="true"
      aria-label="Escolha seu plano"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/75 backdrop-blur-sm"
      />
      <div className="pb-safe animate-fade-up relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-brand-500/30 bg-[rgb(20_10_28)] p-5 shadow-[0_0_80px_-20px] shadow-brand-600 sm:rounded-[28px] sm:p-7">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-white/5 text-fg-muted hover:bg-white/10 hover:text-fg"
        >
          <X className="size-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <Logo />
          <h2 className="mt-4 text-2xl font-extrabold">Escolha seu plano</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Assine e comece a assistir agora mesmo.
          </p>
        </div>

        <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-fg-muted">
          {PERKS.map((p) => (
            <li key={p} className="flex items-center gap-1">
              <Check className="size-3.5 text-brand-300" /> {p}
            </li>
          ))}
        </ul>

        {plans.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-line p-5 text-center text-sm text-fg-muted">
            Os planos estão sendo atualizados. Volte em instantes!
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {plans.map((p) => (
              <a
                key={p.id}
                href={p.checkoutUrl}
                className={`relative block rounded-2xl border p-4 transition hover:-translate-y-0.5 ${
                  p.highlight
                    ? "border-brand-400 bg-gradient-to-br from-brand-600/30 to-brand-900/40 shadow-[0_0_40px_-16px] shadow-brand-500"
                    : "border-white/10 bg-white/[0.03] hover:border-brand-500/50"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-brand-500 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide uppercase">
                    <Crown className="size-3" /> Mais escolhido
                  </span>
                )}
                <div className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-extrabold">{p.name}</p>
                    <p className="text-xs text-fg-muted">{p.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl leading-none font-extrabold">
                      {brl(p.priceCents)}
                    </p>
                    <p className="mt-1 text-[11px] text-fg-subtle">
                      {period(p.durationDays)}
                    </p>
                    {perMonth(p) && (
                      <p className="text-[11px] font-semibold text-brand-300">
                        {perMonth(p)}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`mt-3 flex h-11 items-center justify-center rounded-full text-sm font-bold ${
                    p.highlight
                      ? "bg-brand-600 hover:bg-brand-500"
                      : "bg-white/10 hover:bg-white/15"
                  }`}
                >
                  Assinar {p.name}
                </span>
              </a>
            ))}
          </div>
        )}

        <p className="mt-5 text-center text-sm text-fg-muted">
          Já é assinante?{" "}
          <Link
            href="/entrar"
            onClick={onClose}
            className="font-bold text-brand-300 hover:underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
