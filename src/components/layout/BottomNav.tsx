"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, LogIn } from "lucide-react";
import { clientBottomNav } from "@/config/navigation";
import { useVisitor, visitorStore } from "@/components/visitor/visitor-store";
import { cn } from "@/lib/utils";

/**
 * Menu inferior estilo app — aparece só no celular.
 * Respeita a barra de gestos do iPhone (pb-safe).
 */
export function BottomNav() {
  const pathname = usePathname();
  const { visitor } = useVisitor();
  const items = visitor ? clientBottomNav.slice(0, 2) : clientBottomNav;

  return (
    <nav
      aria-label="Navegação"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-ink-950/90 backdrop-blur-xl md:hidden"
    >
      <ul className="grid h-16 grid-cols-4">
        {items.map(({ href, label, icon: Icon, ready }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={ready ? href : "#"}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                  active ? "text-fg" : "text-fg-subtle",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-brand-600/25 text-brand-300",
                  )}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
        {visitor && (
          <>
            <li>
              <button
                type="button"
                onClick={visitorStore.openPlans}
                className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-bold text-brand-300"
              >
                <span className="flex h-7 w-12 items-center justify-center rounded-full bg-brand-600/25">
                  <Crown className="size-5" />
                </span>
                Assinar
              </button>
            </li>
            <li>
              <Link
                href="/entrar"
                className="flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-fg-subtle"
              >
                <span className="flex h-7 w-12 items-center justify-center rounded-full">
                  <LogIn className="size-5" />
                </span>
                Entrar
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
