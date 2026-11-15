import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ToastProvider } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel Dorama LGBT" },
  // O painel nunca deve aparecer no Google
  robots: { index: false, follow: false },
};

/**
 * Moldura do PAINEL ADMINISTRATIVO.
 * Antes de mostrar qualquer tela, o servidor confere se quem acessa é admin
 * (na tabela "admins" do banco). Quem não for, volta para o login do painel.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-dvh lg:flex">
        <AdminSidebar />
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-6xl">
            <Suspense fallback={<Checking />}>
              <AdminGate>{children}</AdminGate>
            </Suspense>
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      {children}
    </>
  );
}

function Checking() {
  return (
    <div className="flex items-center justify-center gap-2 py-24 text-sm text-fg-muted">
      <Loader2 className="size-4 animate-spin" /> Verificando acesso…
    </div>
  );
}
