import { cn } from "@/lib/utils";

/**
 * Arte do dorama (capa ou banner).
 * Se houver imagem real cadastrada, mostra a imagem.
 * Se não houver, gera uma arte provisória com as cores do app.
 */
const palettes: [string, string, string][] = [
  ["#8f00cc", "#e040fb", "#1a0526"],
  ["#5b21b6", "#f472b6", "#140a24"],
  ["#c026d3", "#4f46e5", "#0d0619"],
  ["#7c3aed", "#22d3ee", "#0a0a1f"],
  ["#db2777", "#8f00cc", "#1a0414"],
  ["#4338ca", "#a855f7", "#0b0820"],
  ["#0ea5e9", "#8f00cc", "#060c1c"],
  ["#f97316", "#c026d3", "#1c0810"],
  ["#14b8a6", "#7c3aed", "#061514"],
  ["#a21caf", "#f0abfc", "#15061a"],
  ["#2563eb", "#ec4899", "#0a0a1c"],
  ["#b91c1c", "#7e22ce", "#170508"],
  ["#0891b2", "#e040fb", "#04121a"],
  ["#6d28d9", "#fb7185", "#120a1e"],
];

type Variant = "poster" | "backdrop";

export function Artwork({
  seed,
  title,
  imageUrl,
  variant = "poster",
  showTitle = variant === "poster",
  className,
  priority,
  fallbackUrl,
  fallbackPosition = "center",
}: {
  seed: number;
  title: string;
  imageUrl?: string;
  /**
   * Capa vertical usada quando não há banner (ex.: doramas importados):
   * aparece inteira, sobre um fundo desfocado feito com ela mesma.
   */
  fallbackUrl?: string;
  /** "right-mobile": capa à direita só no celular (no computador a página já mostra a capa ao lado) */
  fallbackPosition?: "center" | "right" | "right-mobile";
  variant?: Variant;
  showTitle?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const [c1, c2, c3] = palettes[seed % palettes.length];

  if (!imageUrl && fallbackUrl && variant === "backdrop") {
    return (
      <div role="img" aria-label={title} className={cn("relative h-full w-full overflow-hidden bg-ink-950", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- fundo desfocado */}
        <img
          src={fallbackUrl}
          alt=""
          aria-hidden="true"
          loading={priority ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-55 blur-2xl"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- capa vertical inteira */}
        <img
          src={fallbackUrl}
          alt=""
          loading={priority ? "eager" : "lazy"}
          className={cn(
            "absolute inset-y-0 h-full w-auto max-w-none object-contain",
            fallbackPosition === "center" ? "left-1/2 -translate-x-1/2" : "right-[6%]",
            fallbackPosition === "right-mobile" && "lg:hidden",
          )}
        />
      </div>
    );
  }

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- imagens virão do R2 com URL assinada
      <img
        src={imageUrl}
        alt={title}
        loading={priority ? "eager" : "lazy"}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={title}
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{
        background: `radial-gradient(120% 80% at 85% 5%, ${c1} 0%, transparent 55%),
          radial-gradient(90% 70% at 5% 95%, ${c2}cc 0%, transparent 60%),
          ${c3}`,
      }}
    >
      {/* "Lua" de luz */}
      <div
        className="absolute rounded-full opacity-70 blur-2xl"
        style={{
          background: c2,
          width: variant === "poster" ? "55%" : "30%",
          aspectRatio: "1",
          top: variant === "poster" ? "18%" : "10%",
          left: variant === "poster" ? `${10 + (seed % 4) * 10}%` : "55%",
        }}
      />
      {/* Linhas finas diagonais (textura cinematográfica) */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, #fff 0 1px, transparent 1px 14px)",
        }}
      />
      {showTitle && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-16">
          <p className="font-display text-[clamp(0.85rem,2.4vw,1.15rem)] leading-[1.05] font-extrabold tracking-tight text-white uppercase drop-shadow-lg">
            {title}
          </p>
        </div>
      )}
    </div>
  );
}
