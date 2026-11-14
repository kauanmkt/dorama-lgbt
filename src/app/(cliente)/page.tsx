import { Info, Play, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PosterPlaceholder } from "@/components/ui/PosterPlaceholder";

/**
 * PÁGINA INICIAL — versão da Etapa 1 (prévia visual).
 * Os dados abaixo são fictícios. Na Etapa 2 a home ganha todos os carrosséis
 * e, na Etapa 4, passa a ler o catálogo real do Supabase.
 */
const previewRow = [
  "Amor em Seul",
  "Entre Ondas",
  "Café das 7",
  "Promessa de Verão",
  "Linhas Cruzadas",
  "Céu de Bangkok",
  "Segredo do Campus",
  "Luz de Neon",
];

export default function HomePage() {
  return (
    <>
      {/* ===== Banner de destaque ===== */}
      <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden md:min-h-[88svh]">
        {/* Arte provisória: luzes roxas no lugar da imagem do banner */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-ink-900">
          <div className="animate-glow absolute top-[-10%] right-[-10%] h-[70vmax] w-[70vmax] rounded-full bg-brand-600/70 blur-[110px]" />
          <div className="animate-glow absolute bottom-[-20%] left-[20%] h-[45vmax] w-[45vmax] rounded-full bg-accent-500/40 blur-[110px] [animation-delay:-3s]" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/85 via-ink-950/10 to-transparent" />
        </div>

        <div className="mx-auto w-full max-w-[1600px] px-4 pb-14 sm:px-6 md:pb-24 lg:px-10">
          <div className="max-w-xl animate-fade-up">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone="brand">Em destaque</Badge>
              <Badge>BL</Badge>
              <Badge>Romance</Badge>
              <span className="text-xs font-semibold text-fg-muted">2026 · 12 episódios · 16+</span>
            </div>

            <h1 className="text-4xl leading-[1.05] font-extrabold sm:text-5xl lg:text-6xl">
              Título do Dorama
              <span className="text-gradient-brand block">em Destaque</span>
            </h1>

            <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-fg-muted sm:text-base">
              Aqui aparecerá a sinopse do dorama escolhido como destaque no painel
              administrativo. Uma descrição curta, envolvente e direta para convidar o
              usuário a dar o play.
            </p>

            <div className="mt-7 flex items-center gap-3">
              <Button size="lg" className="flex-1 sm:flex-none">
                <Play className="fill-current" /> Assistir
              </Button>
              <Button size="lg" variant="ghost" className="flex-1 sm:flex-none">
                <Plus /> Minha Lista
              </Button>
              <Button size="icon" variant="ghost" aria-label="Mais informações" className="hidden h-13 w-13 sm:inline-flex">
                <Info />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Prévia de carrossel ===== */}
      <section className="relative z-10 -mt-6 md:-mt-12">
        <div className="mx-auto max-w-[1600px]">
          <h2 className="mb-3 px-4 text-lg font-bold sm:px-6 md:text-xl lg:px-10">Lançamentos</h2>
          <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:scroll-px-6 sm:px-6 lg:scroll-px-10 lg:px-10">
            {previewRow.map((title, i) => (
              <div
                key={title}
                className="w-[38%] shrink-0 snap-start sm:w-[24%] md:w-[18%] lg:w-[14%]"
              >
                <PosterPlaceholder
                  title={title}
                  seed={i}
                  className="transition-transform duration-300 hover:scale-[1.04]"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
