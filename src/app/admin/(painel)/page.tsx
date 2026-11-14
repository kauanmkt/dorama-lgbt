import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  Clapperboard,
  Clock,
  FileEdit,
  Film,
  HardDrive,
  Plus,
  UploadCloud,
  UserPlus,
  Users,
} from "lucide-react";
import { Artwork } from "@/components/catalog/Artwork";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { getAdminDoramas, getDashboardStats, getUsers } from "@/lib/admin";
import { accessStatus, formatBytes, formatRelative, statusLabel, statusTone } from "@/lib/format";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** DASHBOARD — visão geral da plataforma. */
export default async function AdminDashboardPage() {
  const [stats, doramas, users] = await Promise.all([getDashboardStats(), getAdminDoramas(), getUsers()]);

  const recentContent = [...doramas].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);
  const recentUsers = [...users].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const cards = [
    { label: "Usuários", value: stats.users, sub: `${stats.activeUsers} com acesso ativo`, icon: Users, href: "/admin/usuarios" },
    { label: "Doramas", value: stats.doramas, sub: `${stats.published} publicados · ${stats.drafts} rascunhos`, icon: Clapperboard, href: "/admin/doramas" },
    { label: "Episódios", value: stats.episodes, sub: `${stats.episodesWithoutVideo} sem vídeo`, icon: Film, href: "/admin/videos" },
    { label: "Armazenamento", value: formatBytes(stats.storageBytes), sub: "Vídeos no Cloudflare R2", icon: HardDrive, href: "/admin/videos" },
  ];

  const alerts = [
    stats.episodesWithoutVideo > 0 && {
      icon: UploadCloud,
      text: plural(stats.episodesWithoutVideo, "episódio ainda sem vídeo", "episódios ainda sem vídeo"),
      href: "/admin/videos",
    },
    stats.expiringSoon > 0 && {
      icon: Clock,
      text: plural(stats.expiringSoon, "assinatura vence nos próximos 7 dias", "assinaturas vencem nos próximos 7 dias"),
      href: "/admin/usuarios",
    },
    stats.drafts > 0 && {
      icon: FileEdit,
      text: plural(stats.drafts, "dorama em rascunho aguardando publicação", "doramas em rascunho aguardando publicação"),
      href: "/admin/doramas",
    },
  ].filter(Boolean) as { icon: typeof Clock; text: string; href: string }[];

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-fg-subtle">Bem-vindo de volta 👋</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/admin/videos" variant="outline" size="sm">
            <UploadCloud /> Enviar vídeos
          </ButtonLink>
          <ButtonLink href="/admin/doramas/novo" size="sm">
            <Plus /> Novo dorama
          </ButtonLink>
        </div>
      </div>

      {/* Números */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {cards.map(({ label, value, sub, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-2xl border border-line bg-ink-900/70 p-4 transition-colors hover:border-brand-600/50 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-fg-muted">{label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/15 text-brand-300">
                <Icon className="size-[18px]" />
              </span>
            </div>
            <p className="font-display mt-3 text-2xl font-extrabold sm:text-3xl">{value}</p>
            <p className="mt-1 truncate text-xs text-fg-subtle">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Atenção */}
      {alerts.length > 0 && (
        <section className="mt-6 rounded-2xl border border-warning/25 bg-warning/[0.06] p-2">
          <p className="flex items-center gap-2 px-3 pt-2 pb-1 text-xs font-bold tracking-wider text-warning uppercase">
            <AlertTriangle className="size-4" /> Precisa de atenção
          </p>
          <ul>
            {alerts.map(({ icon: Icon, text, href }) => (
              <li key={text}>
                <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-white/5">
                  <Icon className="size-4 text-fg-muted" />
                  {text}
                  <ChevronRight className="ml-auto size-4 text-fg-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Conteúdo recente */}
        <section className="rounded-2xl border border-line bg-ink-900/70">
          <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-[15px] font-bold">Conteúdo atualizado</h2>
            <Link href="/admin/doramas" className="text-sm font-semibold text-brand-300 hover:text-brand-200">
              Ver todos
            </Link>
          </header>
          <ul className="divide-y divide-white/5">
            {recentContent.map((d) => (
              <li key={d.slug}>
                <Link href={`/admin/doramas/${d.slug}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03]">
                  <div className="h-12 w-8 shrink-0 overflow-hidden rounded-md">
                    <Artwork seed={d.artSeed} title={d.title} imageUrl={d.posterUrl} showTitle={false} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{d.title}</p>
                    <p className="text-xs text-fg-subtle">{formatRelative(d.updatedAt)}</p>
                  </div>
                  <Badge tone={d.visibility === "publicado" ? "success" : "warning"}>
                    {d.visibility === "publicado" ? "Publicado" : "Rascunho"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Novos usuários */}
        <section className="rounded-2xl border border-line bg-ink-900/70">
          <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-[15px] font-bold">
              Novos usuários
              <span className="flex items-center gap-1 rounded-md bg-success/15 px-1.5 py-0.5 text-[11px] font-bold text-success">
                <UserPlus className="size-3" /> {stats.newUsers} em 30 dias
              </span>
            </h2>
            <Link href="/admin/usuarios" className="text-sm font-semibold text-brand-300 hover:text-brand-200">
              Ver todos
            </Link>
          </header>
          <ul className="divide-y divide-white/5">
            {recentUsers.map((u) => {
              const st = accessStatus(u);
              return (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-700 text-sm font-bold text-brand-200">
                    {u.name[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{u.name}</p>
                    <p className="truncate text-xs text-fg-subtle">{u.email}</p>
                  </div>
                  <Badge tone={statusTone[st]}>{statusLabel[st]}</Badge>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
