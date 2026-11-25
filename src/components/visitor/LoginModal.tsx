"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "@/app/(auth)/entrar/LoginForm";
import { visitorStore } from "./visitor-store";

/** Login em janela (no /cadastro): a pessoa não sai da página nem perde as UTMs. */
export function LoginModal({
  open,
  onClose,
}: {
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
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      data-plans-sheet
      role="dialog"
      aria-modal="true"
      aria-label="Entrar"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="animate-fade-in absolute inset-0 bg-black/75 backdrop-blur-sm"
      />
      <div className="animate-fade-up relative w-full max-w-md rounded-[26px] border border-brand-500/30 bg-[rgb(20_10_28)] p-6 shadow-[0_0_80px_-20px] shadow-brand-600 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-white/5 text-fg-muted hover:bg-white/10 hover:text-fg"
        >
          <X className="size-5" />
        </button>
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="mt-5 text-center">
          <h2 className="text-[28px] leading-tight font-extrabold">Entrar</h2>
          <p className="mt-2 text-sm text-fg-muted">
            Faça login para continuar assistindo
          </p>
        </div>
        <LoginForm purchaseUrl="#planos" onSubscribe={visitorStore.openPlans} />
      </div>
    </div>
  );
}
