import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

/**
 * Moldura da ÁREA DO CLIENTE.
 * Toda página dentro de (cliente)/ ganha cabeçalho, rodapé e menu do celular.
 */
export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-dvh">{children}</main>
      <Footer />
      <BottomNav />
    </>
  );
}
