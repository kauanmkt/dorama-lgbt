import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Atalho "Admin" na área do cliente — só aparece para a conta de administrador.
 * (A conferência é feita no servidor; clientes nunca recebem este botão.)
 */
export async function AdminShortcut({ variant = "header" }: { variant?: "header" | "menu" }) {
  if (!isSupabaseConfigured || !(await isAdmin())) return null;

  if (variant === "menu") {
    return (
      <Link
        href="/admin"
        className="mt-6 flex items-center gap-4 rounded-2xl border border-brand-500/40 bg-brand-600/15 px-5 py-4 text-[15px] font-bold text-brand-200 transition-colors hover:bg-brand-600/25"
      >
        <ShieldCheck className="size-5" />
        Ir para o painel admin
        <span className="ml-auto text-xs font-semibold text-brand-300/80">só você vê</span>
      </Link>
    );
  }

  return (
    <Link
      href="/admin"
      title="Ir para o painel admin"
      className="flex h-9 items-center gap-1.5 rounded-full bg-brand-600/20 px-3 text-xs font-bold text-brand-200 ring-1 ring-brand-500/40 transition hover:bg-brand-600/35"
    >
      <ShieldCheck className="size-4" />
      Admin
    </Link>
  );
}
