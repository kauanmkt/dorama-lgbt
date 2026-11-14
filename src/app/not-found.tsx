import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <p className="font-display text-gradient-brand text-7xl font-extrabold">404</p>
      <div>
        <h1 className="text-xl font-bold">Página não encontrada</h1>
        <p className="mt-2 text-fg-muted">O conteúdo que você procura não existe ou foi removido.</p>
      </div>
      <ButtonLink href="/">Voltar ao início</ButtonLink>
    </div>
  );
}
