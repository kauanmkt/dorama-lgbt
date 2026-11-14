import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  CreditCard,
  HelpCircle,
  KeyRound,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Container } from "@/components/layout/PageIntro";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Perfil" };

/**
 * PERFIL — dados fictícios por enquanto.
 * Nome, plano, validade e telas virão do Supabase (Etapas 4, 5 e 9).
 */
const user = {
  name: "Visitante",
  email: "visitante@exemplo.com",
  plan: { name: "Premium Mensal", screens: 2, activeScreens: 1, expiresAt: "14/12/2026", lifetime: false },
};

const menu = [
  { label: "Dados da conta", icon: ShieldCheck, href: "#" },
  { label: "Alterar senha", icon: KeyRound, href: "/recuperar-senha" },
  { label: "Telas conectadas", icon: MonitorSmartphone, href: "#" },
  { label: "Instalar o app no celular", icon: Smartphone, href: "#" },
  { label: "Ajuda", icon: HelpCircle, href: "#" },
];

export default function ProfilePage() {
  return (
    <Container className="max-w-2xl pt-24 md:pt-28">
      <div className="animate-fade-up flex items-center gap-4">
        <div className="font-display flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-extrabold">
          {user.name[0]}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold">{user.name}</h1>
          <p className="truncate text-sm text-fg-muted">{user.email}</p>
        </div>
      </div>

      {/* Plano */}
      <section className="relative mt-8 overflow-hidden rounded-2xl border border-brand-600/40 bg-gradient-to-br from-brand-900/70 via-ink-850 to-ink-900 p-5 sm:p-6">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-brand-300 uppercase">Seu plano</p>
            <p className="font-display mt-1 text-2xl font-extrabold">{user.plan.name}</p>
          </div>
          <Badge tone="success">Ativo</Badge>
        </div>
        <dl className="relative mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-fg-subtle">Válido até</dt>
            <dd className="mt-0.5 font-bold">{user.plan.lifetime ? "Vitalício" : user.plan.expiresAt}</dd>
          </div>
          <div>
            <dt className="text-fg-subtle">Telas simultâneas</dt>
            <dd className="mt-0.5 font-bold">
              {user.plan.activeScreens} de {user.plan.screens} em uso
            </dd>
          </div>
        </dl>
        <button
          type="button"
          className="relative mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-white/10 py-3 text-sm font-bold transition hover:bg-white/15"
        >
          <CreditCard className="size-4" /> Gerenciar assinatura
        </button>
      </section>

      {/* Menu */}
      <nav className="mt-6 overflow-hidden rounded-2xl border border-line bg-ink-900/60">
        <ul className="divide-y divide-white/5">
          {menu.map(({ label, icon: Icon, href }) => (
            <li key={label}>
              <Link
                href={href}
                className="flex items-center gap-4 px-5 py-4 text-[15px] font-semibold transition-colors hover:bg-white/[0.04]"
              >
                <Icon className="size-5 text-fg-muted" />
                {label}
                <ChevronRight className="ml-auto size-4 text-fg-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Link
        href="/entrar"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-4 text-[15px] font-bold text-danger transition-colors hover:bg-danger/10"
      >
        <LogOut className="size-5" /> Sair da conta
      </Link>
    </Container>
  );
}
