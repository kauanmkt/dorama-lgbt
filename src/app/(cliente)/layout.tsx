import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getPublicSetting } from "@/lib/settings";

/**
 * Moldura da ÁREA DO CLIENTE.
 * Toda página dentro de (cliente)/ ganha cabeçalho, rodapé e menu do celular.
 */
export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const announcement = (await getPublicSetting<string>("announcement"))?.trim();
  return (
    <>
      <Header />
      <main className="min-h-dvh">{children}</main>
      <Footer />
      <BottomNav />
      {announcement && <AnnouncementBar text={announcement} />}
    </>
  );
}
