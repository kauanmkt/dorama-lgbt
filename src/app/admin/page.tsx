import { Clapperboard, Film, Plus, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * DASHBOARD — versão da Etapa 1 (estrutura visual).
 * Os números ficam zerados até a integração com o Supabase (Etapa 4).
 */
const stats = [
  { label: "Usuários", value: "0", icon: Users },
  { label: "Doramas", value: "0", icon: Clapperboard },
  { label: "Episódios", value: "0", icon: Film },
  { label: "Novos (30d)", value: "0", icon: Sparkles },
];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-fg-subtle">Bem-vindo de volta</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Dashboard</h1>
        </div>
        <Button disabled>
          <Plus /> Novo dorama
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-line bg-ink-900/70 p-4 transition-colors hover:border-brand-600/50 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-fg-muted">{label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/15 text-brand-300">
                <Icon className="size-[18px]" />
              </span>
            </div>
            <p className="font-display mt-4 text-3xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center sm:p-12">
        <p className="font-display text-lg font-bold">Nenhum conteúdo cadastrado ainda</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
          O cadastro de doramas, temporadas e episódios chega nas próximas etapas. Esta tela já
          mostra como o painel vai se organizar.
        </p>
      </div>
    </div>
  );
}
