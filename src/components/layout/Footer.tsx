import { Logo } from "@/components/brand/Logo";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-white/5 pb-28 md:pb-12">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 pt-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-10">
        <Logo className="opacity-80" />
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-subtle">
          <span>Termos de uso</span>
          <span>Privacidade</span>
          <span>Ajuda</span>
        </nav>
        <p className="text-xs text-fg-subtle">© 2026 Dorama LGBT. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
