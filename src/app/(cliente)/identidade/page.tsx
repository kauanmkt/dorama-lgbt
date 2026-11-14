import type { Metadata } from "next";
import { Play, Plus, Trash2 } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PosterPlaceholder } from "@/components/ui/PosterPlaceholder";

export const metadata: Metadata = { title: "Identidade visual" };

/**
 * GUIA DE IDENTIDADE VISUAL — página interna de referência.
 * Mostra cores, fontes e componentes do app num só lugar.
 * Será removida (ou protegida) antes do lançamento.
 */
const brandScale = [
  ["50", "bg-brand-50"],
  ["100", "bg-brand-100"],
  ["200", "bg-brand-200"],
  ["300", "bg-brand-300"],
  ["400", "bg-brand-400"],
  ["500", "bg-brand-500"],
  ["600", "bg-brand-600"],
  ["700", "bg-brand-700"],
  ["800", "bg-brand-800"],
  ["900", "bg-brand-900"],
  ["950", "bg-brand-950"],
] as const;

const surfaces = [
  ["ink-950", "bg-ink-950", "Fundo principal"],
  ["ink-900", "bg-ink-900", "Seções"],
  ["ink-850", "bg-ink-850", "Cards"],
  ["ink-800", "bg-ink-800", "Cards elevados"],
  ["ink-700", "bg-ink-700", "Campos / hover"],
  ["line", "bg-line", "Bordas"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-ink-900/60 p-5 sm:p-8">
      <h2 className="mb-6 text-sm font-bold tracking-[0.2em] text-brand-300 uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default function IdentidadePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pt-24 sm:px-6 md:pt-28">
      <header className="animate-fade-up mb-10">
        <p className="text-sm font-semibold text-fg-subtle">Etapa 1 · Guia interno</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Identidade visual</h1>
        <p className="mt-3 max-w-2xl text-fg-muted">
          Todas as cores, fontes e componentes do Dorama LGBT. Ao alterar um item aqui na base,
          ele muda no app inteiro.
        </p>
      </header>

      <Section title="Marca (provisória)">
        <div className="flex flex-wrap items-center gap-10">
          <Logo size="lg" />
          <LogoMark className="h-16 w-16" />
          <LogoMark className="h-10 w-10" />
        </div>
      </Section>

      <Section title="Roxo da marca">
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
          {brandScale.map(([name, bg]) => (
            <div key={name} className="space-y-1.5">
              <div
                className={`${bg} aspect-square rounded-lg ring-1 ring-white/10 ${name === "600" ? "ring-2 ring-white" : ""}`}
              />
              <p className="text-center text-[11px] text-fg-subtle">{name}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-fg-muted">
          <strong className="text-fg">brand-600 = #8F00CC</strong> — cor oficial, usada em botões
          principais e destaques.
        </p>
      </Section>

      <Section title="Fundos (preto → roxo escuro)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {surfaces.map(([name, bg, use]) => (
            <div key={name}>
              <div className={`${bg} h-20 rounded-xl ring-1 ring-white/10`} />
              <p className="mt-2 text-sm font-semibold">{name}</p>
              <p className="text-xs text-fg-subtle">{use}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografia">
        <div className="space-y-4">
          <p className="font-display text-5xl font-extrabold">Sora — Títulos</p>
          <p className="font-display text-2xl font-bold">Temporada 1 · Episódio 4</p>
          <p className="text-lg">
            Manrope — Textos. Leitura confortável em telas pequenas, com números claros: 0123456789.
          </p>
          <p className="text-fg-muted">Texto secundário para sinopses e descrições.</p>
          <p className="text-sm text-fg-subtle">Texto auxiliar, legendas e metadados.</p>
        </div>
      </Section>

      <Section title="Botões">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Play className="fill-current" /> Assistir
          </Button>
          <Button variant="secondary">Continuar</Button>
          <Button variant="ghost">
            <Plus /> Minha Lista
          </Button>
          <Button variant="outline">Cancelar</Button>
          <Button variant="danger">
            <Trash2 /> Excluir
          </Button>
          <Button size="sm">Pequeno</Button>
          <Button disabled>Desativado</Button>
        </div>
      </Section>

      <Section title="Etiquetas">
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">BL</Badge>
          <Badge tone="brand">GL</Badge>
          <Badge>Romance</Badge>
          <Badge tone="success">Publicado</Badge>
          <Badge tone="warning">Rascunho</Badge>
          <Badge tone="danger">Suspenso</Badge>
        </div>
      </Section>

      <Section title="Capas">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {["Amor em Seul", "Entre Ondas", "Café das 7", "Luz de Neon", "Céu de Bangkok", "Linhas"].map(
            (t, i) => (
              <PosterPlaceholder key={t} title={t} seed={i} />
            ),
          )}
        </div>
      </Section>
    </div>
  );
}
