"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Carrossel horizontal ("trilho") estilo Netflix.
 * Celular: arrasta com o dedo. Computador: setas laterais.
 */
export function Rail({
  title,
  href,
  children,
  itemClassName = "w-[36%] sm:w-[24%] md:w-[18.5%] lg:w-[15.2%] 2xl:w-[12.6%]",
}: {
  title: string;
  href?: string;
  children: React.ReactNode[];
  itemClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (children.length === 0) return null;

  return (
    <section className="group/rail relative">
      <div className="mb-3 flex items-end justify-between px-4 sm:px-6 lg:px-10">
        <h2 className="text-lg font-bold md:text-xl">{title}</h2>
        {href && (
          <Link
            href={href}
            className="flex items-center gap-0.5 text-sm font-semibold text-fg-muted transition-colors hover:text-brand-300"
          >
            Ver tudo <ChevronRight className="size-4" />
          </Link>
        )}
      </div>

      <div className="relative">
        <div
          ref={ref}
          onScroll={update}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-px-4 px-4 pt-1 pb-4 sm:scroll-px-6 sm:px-6 lg:scroll-px-10 lg:px-10"
        >
          {children.map((child, i) => (
            <div key={i} className={cn("shrink-0 snap-start", itemClassName)}>
              {child}
            </div>
          ))}
        </div>

        {/* Setas (só computador) */}
        <RailArrow side="left" visible={canPrev} onClick={() => scroll(-1)} />
        <RailArrow side="right" visible={canNext} onClick={() => scroll(1)} />
      </div>
    </section>
  );
}

function RailArrow({
  side,
  visible,
  onClick,
}: {
  side: "left" | "right";
  visible: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Anterior" : "Próximo"}
      onClick={onClick}
      tabIndex={visible ? 0 : -1}
      className={cn(
        "absolute top-1 bottom-4 z-10 hidden w-10 items-center justify-center text-white opacity-0 transition-opacity duration-200 md:flex lg:w-12",
        side === "left"
          ? "left-0 bg-gradient-to-r from-ink-950/95 to-transparent"
          : "right-0 bg-gradient-to-l from-ink-950/95 to-transparent",
        visible ? "group-hover/rail:opacity-100" : "pointer-events-none",
      )}
    >
      <Icon className="size-8 transition-transform hover:scale-125" />
    </button>
  );
}
