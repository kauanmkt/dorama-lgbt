import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Artwork } from "@/components/catalog/Artwork";

/** Moldura das telas de login (cliente e painel). */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      {/* Mosaico de capas ao fundo */}
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <div className="grid -rotate-6 scale-125 grid-cols-4 gap-3 opacity-40 sm:grid-cols-6 lg:grid-cols-8">
          {Array.from({ length: 32 }, (_, i) => (
            <div key={i} className="aspect-[2/3] overflow-hidden rounded-xl">
              <Artwork seed={i} title="" showTitle={false} />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/80 via-ink-950/90 to-ink-950" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_40%,rgb(143_0_204/0.25),transparent)]" />
      </div>

      <header className="pt-safe px-5 sm:px-8">
        <div className="flex h-16 items-center">
          <Link href="/" aria-label="Dorama LGBT — início">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="animate-fade-up w-full max-w-md rounded-3xl border border-white/10 bg-ink-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {children}
        </div>
      </main>

      <footer className="pb-safe px-5 py-6 text-center text-xs text-fg-subtle">
        © 2026 Dorama LGBT · Termos de uso · Privacidade
      </footer>
    </div>
  );
}
