import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ToastProvider } from "@/components/admin/ui";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel Dorama LGBT" },
  // O painel nunca deve aparecer no Google
  robots: { index: false, follow: false },
};

/**
 * Moldura do PAINEL ADMINISTRATIVO.
 * A proteção real (só admin entra) chega na Etapa 5, verificada no servidor.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-dvh lg:flex">
        <AdminSidebar />
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-6xl">
            {isSupabaseConfigured && (
              <p className="mb-6 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning ring-1 ring-warning/25">
                <strong>Painel em modo de exemplo:</strong> o catálogo do site já vem do Supabase, mas
                estas telas ainda mostram dados fictícios e não salvam. A conexão do painel chega nas
                Etapas 5 (login de admin) e 6 (cadastro).
              </p>
            )}
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
