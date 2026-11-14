import { cn } from "@/lib/utils";

/**
 * Capa provisória (gradiente) usada enquanto não há imagens reais.
 * Na Etapa 2/6 será trocada pelas capas enviadas no painel.
 */
const palettes = [
  "from-brand-700 via-brand-900 to-ink-950",
  "from-accent-500/80 via-brand-800 to-ink-950",
  "from-indigo-600 via-brand-900 to-ink-950",
  "from-rose-500/80 via-brand-800 to-ink-950",
  "from-brand-500 via-indigo-900 to-ink-950",
  "from-fuchsia-600 via-ink-700 to-ink-950",
];

export function PosterPlaceholder({
  title,
  seed = 0,
  className,
}: {
  title: string;
  seed?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[2/3] overflow-hidden rounded-xl bg-gradient-to-br ring-1 ring-white/10",
        palettes[seed % palettes.length],
        className,
      )}
    >
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
        <p className="font-display text-sm leading-tight font-bold">{title}</p>
      </div>
    </div>
  );
}
