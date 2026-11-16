import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/layout/PageIntro";

/** Moldura das páginas dentro de "Perfil" (voltar + título). */
export function SubPage({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Container className="max-w-2xl pt-24 pb-10 md:pt-28">
      <Link
        href="/perfil"
        className="inline-flex items-center gap-1 text-sm font-semibold text-fg-muted transition-colors hover:text-fg"
      >
        <ChevronLeft className="size-4" /> Perfil
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{title}</h1>
      {description && <p className="mt-1.5 text-fg-muted">{description}</p>}
      <div className="mt-6 space-y-4">{children}</div>
    </Container>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-ink-900/60 p-5 ${className}`}>{children}</section>;
}
