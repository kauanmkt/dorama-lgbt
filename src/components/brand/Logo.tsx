import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * LOGO PROVISÓRIA — será substituída pela logo oficial.
 * Símbolo (D com um "play" dentro) + nome escrito.
 */
export function LogoMark({ className }: { className?: string }) {
  // id único: evita conflito quando a logo aparece mais de uma vez na tela
  const gradientId = `dl-mark-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn("h-8 w-8 shrink-0", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a61ff0" />
          <stop offset="0.55" stopColor="#8f00cc" />
          <stop offset="1" stopColor="#e040fb" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${gradientId})`} />
      {/* Letra D */}
      <path
        d="M18 14h14c11 0 18 7.6 18 18s-7 18-18 18H18z"
        fill="none"
        stroke="#fff"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      {/* Botão play */}
      <path d="M28 24.5v15l11.5-7.5z" fill="#fff" />
    </svg>
  );
}

export function Logo({
  className,
  showMark = true,
  size = "md",
}: {
  className?: string;
  showMark?: boolean;
  size?: "md" | "lg";
}) {
  return (
    <span className={cn("inline-flex items-center", size === "lg" ? "gap-3.5" : "gap-2.5", className)}>
      {showMark && <LogoMark className={size === "lg" ? "h-12 w-12" : undefined} />}
      <span
        className={cn(
          "font-display leading-none font-extrabold tracking-tight",
          size === "lg" ? "text-3xl" : "text-lg",
        )}
      >
        DORAMA<span className="text-gradient-brand ml-1">LGBT</span>
      </span>
    </span>
  );
}
