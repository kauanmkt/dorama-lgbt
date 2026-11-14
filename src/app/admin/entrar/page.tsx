import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AdminLoginForm } from "./AdminLoginForm";

export const metadata: Metadata = {
  title: "Entrar no painel",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage({ searchParams }: PageProps<"/admin/entrar">) {
  return (
    <AuthShell>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600/15 text-brand-300">
        <ShieldCheck className="size-5" />
      </span>
      <h1 className="mt-4 text-2xl font-extrabold">Painel administrativo</h1>
      <p className="mt-1 text-sm text-fg-muted">Acesso restrito. Entre com e-mail e senha.</p>
      <Suspense fallback={null}>
        <Notice searchParams={searchParams} />
      </Suspense>
      <AdminLoginForm />
    </AuthShell>
  );
}

async function Notice({ searchParams }: { searchParams: PageProps<"/admin/entrar">["searchParams"] }) {
  const { erro } = await searchParams;
  if (erro !== "sem-permissao") return null;
  return (
    <p className="mt-5 flex items-center gap-2 rounded-xl bg-warning/10 px-4 py-3 text-sm font-semibold text-warning ring-1 ring-warning/25">
      <AlertCircle className="size-4 shrink-0" /> Você precisa entrar com uma conta de administrador.
    </p>
  );
}
