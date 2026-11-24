"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowLeftRight, LogOut, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { adminNav } from "@/config/navigation";
import { sair } from "@/lib/session-actions";
import { cn } from "@/lib/utils";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {adminNav.map(({ href, label, icon: Icon, ready }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={ready ? href : "#"}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
                active
                  ? "bg-brand-600/20 text-fg ring-1 ring-brand-500/30"
                  : "text-fg-muted hover:bg-white/5 hover:text-fg",
                !ready && "cursor-default opacity-60 hover:bg-transparent hover:text-fg-muted",
              )}
            >
              <Icon className={cn("size-[18px]", active && "text-brand-300")} />
              {label}
              {!ready && (
                <span className="ml-auto rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-fg-subtle">
                  em breve
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Troca rápida para a área do cliente (mesma conta). */
function ClientSwitch({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link
        href="/"
        className="flex h-9 items-center gap-1.5 rounded-full bg-brand-600/20 px-3 text-xs font-bold text-brand-200 ring-1 ring-brand-500/40"
      >
        <ArrowLeftRight className="size-4" /> Cliente
      </Link>
    );
  }
  return (
    <Link
      href="/"
      className="mb-2 flex items-center gap-3 rounded-xl bg-brand-600/15 px-3 py-2.5 text-sm font-bold text-brand-200 ring-1 ring-brand-500/30 transition-colors hover:bg-brand-600/25"
    >
      <ArrowLeftRight className="size-[18px]" /> Ir para a área do cliente
    </Link>
  );
}

/**
 * Menu do painel administrativo.
 * Computador: barra lateral fixa. Celular: barra no topo + gaveta.
 */
export function AdminSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Celular */}
      <div className="pt-safe sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-ink-950/90 px-4 backdrop-blur-xl lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <ClientSwitch compact />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="animate-fade-in absolute inset-0 bg-black/70"
            onClick={() => setOpen(false)}
          />
          <aside className="pt-safe absolute inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-ink-900 p-4">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Computador */}
      <aside className="sticky top-0 hidden h-dvh w-68 shrink-0 flex-col border-r border-line bg-ink-900/70 p-4 lg:flex">
        <div className="mb-2 px-2 py-3">
          <Logo />
          <p className="mt-2 text-[11px] font-bold tracking-[0.2em] text-fg-subtle uppercase">
            Painel administrativo
          </p>
        </div>
        <nav className="mt-4 flex-1" aria-label="Painel">
          <NavList />
        </nav>
        <ClientSwitch />
        <form action={sair}>
          <input type="hidden" name="para" value="admin" />
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-fg-muted hover:bg-white/5 hover:text-fg"
          >
            <LogOut className="size-[18px]" /> Sair
          </button>
        </form>
      </aside>
    </>
  );
}
