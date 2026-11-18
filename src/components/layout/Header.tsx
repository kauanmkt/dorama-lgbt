"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, User } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { clientTopNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho da área do cliente.
 * Fica transparente sobre o banner e ganha fundo ao rolar a página.
 */
export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "pt-safe fixed inset-x-0 top-0 z-40 transition-colors duration-300",
        scrolled
          ? "border-b border-white/5 bg-ink-950/85 backdrop-blur-xl"
          : "bg-gradient-to-b from-ink-950/90 to-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-8 px-4 sm:px-6 lg:px-10">
        <Link href="/" aria-label="Amora Dramas — início">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {clientTopNav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.ready ? item.href : "#"}
                aria-disabled={!item.ready}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
                  active ? "text-fg" : "text-fg-muted hover:text-fg",
                  !item.ready && "cursor-default",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/buscar"
            aria-label="Buscar"
            className="hidden h-10 w-10 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-white/10 hover:text-fg md:flex"
          >
            <Search className="size-5" />
          </Link>
          <NotificationBell />
          <Link
            href="/perfil"
            aria-label="Minha conta"
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 ring-2 ring-transparent transition hover:ring-brand-300"
          >
            <User className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
