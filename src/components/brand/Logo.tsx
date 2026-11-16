import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * LOGO AMORA DRAMAS — "amora" + uma amora no lugar do ponto final.
 * A amora sozinha é o símbolo (ícone do app, favicon).
 */
function Berry({ className, withLeaf = true }: { className?: string; withLeaf?: boolean }) {
  // id único: evita conflito quando a logo aparece mais de uma vez na tela
  const id = `amora-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="-20 -30 40 50" aria-hidden="true" className={cn("shrink-0", className)}>
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#D27CF5" />
          <stop offset="0.55" stopColor="#8F00CC" />
          <stop offset="1" stopColor="#3D005C" />
        </radialGradient>
      </defs>
      {withLeaf && <path d="M0 -10 C 3 -21 14 -24 19 -18 C 14 -12 6 -9 0 -10 Z" fill="#3E8A65" />}
      <circle cx="0" cy="4" r="15" fill={`url(#${id})`} />
      <circle cx="-7" cy="0" r="3.3" fill="#fff" opacity="0.13" />
      <circle cx="2" cy="-4" r="3.3" fill="#fff" opacity="0.13" />
      <circle cx="8" cy="3" r="3.3" fill="#fff" opacity="0.13" />
      <circle cx="-3" cy="9" r="3.3" fill="#fff" opacity="0.13" />
      <circle cx="6" cy="12" r="3.3" fill="#fff" opacity="0.13" />
      <circle cx="-10" cy="10" r="3.3" fill="#fff" opacity="0.13" />
      <circle cx="0" cy="2" r="3.3" fill="#fff" opacity="0.13" />
      <circle cx="-6" cy="-6" r="3.3" fill="#fff" opacity="0.13" />
      <circle cx="-5" cy="-1" r="4" fill="#fff" opacity="0.4" />
    </svg>
  );
}

/** Símbolo: a amora num quadrado escuro (ícone do app). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[22%] bg-[#1F0A2E] ring-1 ring-white/10",
        className,
      )}
    >
      <Berry className="h-[78%] w-[78%]" />
    </span>
  );
}

export function Logo({
  className,
  showMark = false,
  size = "md",
}: {
  className?: string;
  /** mantido por compatibilidade: a amora já faz parte do nome */
  showMark?: boolean;
  size?: "md" | "lg";
}) {
  const lg = size === "lg";
  return (
    <span className={cn("inline-flex flex-col leading-none", className)} data-mark={showMark || undefined}>
      <span className="inline-flex items-end gap-[0.06em]">
        <span
          className={cn(
            "bg-gradient-to-r from-[#F6E9FF] via-[#E3B3FF] to-[#E0218A] bg-clip-text font-[family-name:var(--font-logo)] font-extrabold tracking-[-0.04em] text-transparent",
            lg ? "text-5xl" : "text-[1.55rem]",
          )}
        >
          amora
        </span>
        <Berry className={lg ? "mb-[0.12em] h-9 w-7" : "mb-[0.08em] h-5 w-4"} />
      </span>
      <span
        className={cn(
          "pl-[0.1em] font-bold text-fg-muted uppercase",
          lg ? "mt-1.5 text-sm tracking-[0.9em]" : "mt-0.5 text-[0.55rem] tracking-[0.85em]",
        )}
      >
        Dramas
      </span>
    </span>
  );
}
