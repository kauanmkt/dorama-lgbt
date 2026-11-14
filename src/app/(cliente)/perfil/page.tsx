import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, HelpCircle, LogOut, MonitorSmartphone, ShieldCheck, Smartphone } from "lucide-react";
import { Container } from "@/components/layout/PageIntro";
import { Badge } from "@/components/ui/Badge";
import { getMyAccess, getMyProfile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { sair } from "@/lib/session-actions";
import { getPublicSetting } from "@/lib/settings";

export const metadata: Metadata = { title: "Perfil" };

const menu = [
  { label: "Dados da conta", icon: ShieldCheck, href: "#" },
  { label: "Telas conectadas", icon: MonitorSmartphone, href: "#" },
  { label: "Instalar o app no celular", icon: Smartphone, href: "#" },
  { label: "Ajuda", icon: HelpCircle, href: "#" },
];

export default function ProfilePage() {
  return (
    <Container className="max-w-2xl pt-24 md:pt-28">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent />
      </Suspense>

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

      <form action={sair} className="mt-6">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-4 text-[15px] font-bold text-danger transition-colors hover:bg-danger/10"
        >
          <LogOut className="size-5" /> Sair da conta
        </button>
      </form>
    </Container>
  );
}

async function ProfileContent() {
  const [profile, access, purchaseUrl] = await Promise.all([
    getMyProfile(),
    getMyAccess(),
    getPublicSetting<string>("purchase_url"),
  ]);
  const name = profile?.name || "Assinante";
  const statusBadge = access.hasAccess
    ? { tone: "success" as const, label: "Ativo" }
    : access.status === "suspensa"
      ? { tone: "danger" as const, label: "Suspenso" }
      : { tone: "warning" as const, label: access.planName ? "Expirado" : "Sem plano" };

  return (
    <>
      <div className="animate-fade-up flex items-center gap-4">
        <div className="font-display flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-extrabold uppercase">
          {name[0]}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold">{name}</h1>
          <p className="truncate text-sm text-fg-muted">{profile?.email}</p>
        </div>
      </div>

      <section className="relative mt-8 overflow-hidden rounded-2xl border border-brand-600/40 bg-gradient-to-br from-brand-900/70 via-ink-850 to-ink-900 p-5 sm:p-6">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-brand-300 uppercase">Seu plano</p>
            <p className="font-display mt-1 text-2xl font-extrabold">{access.planName ?? "Nenhum plano"}</p>
          </div>
          <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
        </div>
        <dl className="relative mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-fg-subtle">Válido até</dt>
            <dd className="mt-0.5 font-bold">{access.lifetime ? "Vitalício" : formatDate(access.expiresAt)}</dd>
          </div>
          <div>
            <dt className="text-fg-subtle">Telas simultâneas</dt>
            <dd className="mt-0.5 font-bold">{access.screens || "—"}</dd>
          </div>
        </dl>
        {!access.hasAccess && purchaseUrl && (
          <a
            href={purchaseUrl}
            className="relative mt-6 flex w-full items-center justify-center rounded-full bg-brand-600 py-3 text-sm font-bold transition hover:bg-brand-500"
          >
            Renovar assinatura
          </a>
        )}
      </section>
    </>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 animate-pulse rounded-2xl bg-ink-800" />
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded bg-ink-800" />
          <div className="h-4 w-52 animate-pulse rounded bg-ink-800" />
        </div>
      </div>
      <div className="mt-8 h-44 animate-pulse rounded-2xl bg-ink-850" />
    </>
  );
}
