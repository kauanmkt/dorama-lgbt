import { Suspense } from "react";
import { Logo } from "@/components/brand/Logo";
import { getAllDoramas } from "@/lib/catalog";

/**
 * Moldura das telas de login (cliente e painel):
 * parede de capas reais girada, com colunas subindo e descendo devagar,
 * e o cartão de login no centro com a logo da Amora.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-black">
      <Suspense fallback={null}>
        <PosterWall />
      </Suspense>
      {/* brilho roxo no topo + escurecido para o cartão se destacar */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_50%_0%,rgb(143_0_204/0.22),transparent_70%)]"
      />

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="animate-fade-up w-full max-w-[27rem] rounded-[26px] border border-brand-500/30 bg-[rgb(20_10_28/0.8)] px-7 py-8 shadow-[0_30px_70px_-30px_#000,0_0_40px_-14px_rgb(143_0_204/0.55)] backdrop-blur-sm">
          <div className="mb-6 flex justify-center">
            <Logo size="lg" />
          </div>
          {children}
        </div>
      </main>

      <footer className="pb-safe px-5 py-5 text-center text-xs text-fg-subtle">
        © 2026 Amora Dramas · Termos de uso · Privacidade
      </footer>
    </div>
  );
}

const COLUMNS = 5;
const PER_COLUMN = 6;

async function PosterWall() {
  let posters: string[] = [];
  try {
    posters = (await getAllDoramas()).map((d) => d.posterUrl).filter((u): u is string => Boolean(u));
  } catch {
    posters = [];
  }
  if (posters.length < COLUMNS) return null;

  const columns = Array.from({ length: COLUMNS }, (_, c) =>
    Array.from({ length: PER_COLUMN }, (_, i) => posters[(c * PER_COLUMN + i) % posters.length]),
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-x-[10%] -inset-y-[12%] -z-20 grid -rotate-[9deg] scale-[1.12] grid-cols-5 gap-2.5 opacity-50"
    >
      {columns.map((col, c) => (
        <div
          key={c}
          className={`flex flex-col gap-2.5 motion-reduce:animate-none ${c % 2 ? "animate-poster-down" : "animate-poster-up"}`}
        >
          {/* a lista aparece 2 vezes para a rolagem emendar sem pulo */}
          {[...col, ...col].map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- capas leves do Storage, sem otimização da Vercel
            <img
              key={i}
              src={src}
              alt=""
              draggable={false}
              loading={i < 4 ? "eager" : "lazy"}
              decoding="async"
              className="block aspect-[2/3] w-full rounded-[14px] bg-ink-900 object-cover"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
