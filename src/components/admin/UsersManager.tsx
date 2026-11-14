"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Ban,
  CalendarPlus,
  Infinity as InfinityIcon,
  Loader2,
  Minus,
  MonitorPlay,
  Plus,
  ShieldCheck,
  Unlock,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  AdminHeader,
  Drawer,
  EmptyState,
  FormField,
  Modal,
  SearchInput,
  Segmented,
  SelectInput,
  TextInput,
  Toggle,
  useToast,
} from "@/components/admin/ui";
import { desconectarTelas, liberarAcesso, salvarAcesso } from "@/lib/admin-actions";
import { accessStatus, formatDate, formatRelative, statusLabel, statusTone } from "@/lib/format";
import type { AccessStatus, AdminUser, Plan } from "@/types/admin";

type Filter = "todos" | AccessStatus;

const toInputDate = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const fromInputDate = (v: string) => (v ? new Date(`${v}T23:59:59-03:00`).toISOString() : undefined);
const addDays = (iso: string | undefined, days: number, now: Date) => {
  const base = iso && new Date(iso) > now ? new Date(iso) : now;
  return new Date(base.getTime() + days * 86_400_000).toISOString();
};

/** USUÁRIOS — busca, filtros e gestão de acesso de cada cliente. */
export function UsersManager({ initial, plans, now: nowIso }: { initial: AdminUser[]; plans: Plan[]; now: string }) {
  const toast = useToast();
  const router = useRouter();
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [saving, startSaving] = useTransition();
  const [users, setUsers] = useState(initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [granting, setGranting] = useState(false);

  const planName = (id?: string) => plans.find((p) => p.id === id)?.name ?? "—";

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { todos: users.length, ativo: 0, expirado: 0, suspenso: 0, sem_plano: 0 };
    users.forEach((u) => c[accessStatus(u, now)]++);
    return c;
  }, [users, now]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (filter === "todos" || accessStatus(u, now) === filter) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    );
  }, [users, query, filter, now]);

  /** Salva no servidor; só atualiza a tela se der certo. */
  const update = (u: AdminUser, message: string, kind: "acesso" | "telas" = "acesso") => {
    startSaving(async () => {
      const res =
        kind === "telas"
          ? await desconectarTelas(u.id)
          : await salvarAcesso({
              userId: u.id,
              planId: u.planId,
              lifetime: u.lifetime,
              expiresAt: u.expiresAt,
              extraScreens: u.extraScreens,
              suspended: u.suspended,
            });
      if (!res.ok) {
        toast(res.error, "error");
        return;
      }
      setUsers((l) => l.map((x) => (x.id === u.id ? u : x)));
      setSelected(u);
      toast(message);
      router.refresh();
    });
  };

  return (
    <>
      <AdminHeader
        title="Usuários"
        description="Gerencie contas, planos, validade e telas de cada cliente."
        actions={
          <Button size="sm" onClick={() => setGranting(true)}>
            <UserPlus /> Liberar acesso
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "todos", label: "Todos", count: counts.todos },
            { value: "ativo", label: "Ativos", count: counts.ativo },
            { value: "expirado", label: "Expirados", count: counts.expirado },
            { value: "suspenso", label: "Suspensos", count: counts.suspenso },
            { value: "sem_plano", label: "Sem plano", count: counts.sem_plano },
          ]}
        />
        <SearchInput
          placeholder="Buscar por nome ou e-mail"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="lg:w-72"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-ink-900/70">
        {shown.length === 0 ? (
          <EmptyState icon={<Users />} title="Nenhum usuário encontrado" />
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1fr)_130px_120px_110px_110px] gap-4 border-b border-line px-5 py-3 text-xs font-bold tracking-wider text-fg-subtle uppercase md:grid">
              <span>Usuário</span>
              <span>Plano</span>
              <span>Válido até</span>
              <span>Último acesso</span>
              <span>Status</span>
            </div>
            <ul className="divide-y divide-white/5">
              {shown.map((u) => {
                const st = accessStatus(u, now);
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(u)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-white/[0.03] md:grid-cols-[minmax(0,1fr)_130px_120px_110px_110px] md:px-5"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-700 text-sm font-bold text-brand-200">
                          {u.name[0]}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 truncate text-sm font-bold">
                            {u.name}
                            {u.isAdmin && <ShieldCheck className="size-3.5 shrink-0 text-brand-300" aria-label="Administrador" />}
                          </span>
                          <span className="block truncate text-xs text-fg-subtle">{u.email}</span>
                          <span className="mt-0.5 block text-xs text-fg-muted md:hidden">
                            {planName(u.planId)}
                            {u.lifetime ? " · sem vencimento" : u.expiresAt ? ` · até ${formatDate(u.expiresAt)}` : ""}
                          </span>
                        </span>
                      </span>
                      <span className="hidden text-sm text-fg-muted md:block">{planName(u.planId)}</span>
                      <span className="hidden text-sm text-fg-muted md:block">
                        {u.lifetime ? (
                          <span className="flex items-center gap-1">
                            <InfinityIcon className="size-4" /> Vitalício
                          </span>
                        ) : (
                          formatDate(u.expiresAt)
                        )}
                      </span>
                      <span className="hidden text-sm text-fg-muted md:block">{formatRelative(u.lastSeenAt, now)}</span>
                      <span>
                        {u.isAdmin ? <Badge tone="brand">Admin</Badge> : <Badge tone={statusTone[st]}>{statusLabel[st]}</Badge>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {selected && (
        <UserDrawer
          key={selected.id}
          user={selected}
          plans={plans}
          now={now}
          saving={saving}
          onClose={() => setSelected(null)}
          onUpdate={update}
        />
      )}

      {granting && (
        <GrantModal
          plans={plans}
          now={now}
          onClose={() => setGranting(false)}
          onGrant={async (u) => {
            const res = await liberarAcesso({ email: u.email, name: u.name, planId: u.planId ?? "" });
            if (!res.ok) return res.error;
            setUsers((l) => {
              const existing = l.find((x) => x.email === u.email);
              return existing ? l.map((x) => (x.email === u.email ? { ...x, ...u, id: x.id, name: x.name } : x)) : [u, ...l];
            });
            toast(res.message ?? `Acesso liberado para ${u.email}`);
            setGranting(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function UserDrawer({
  user,
  plans,
  now,
  saving,
  onClose,
  onUpdate,
}: {
  user: AdminUser;
  plans: Plan[];
  now: Date;
  saving: boolean;
  onClose: () => void;
  onUpdate: (u: AdminUser, message: string, kind?: "acesso" | "telas") => void;
}) {
  const [draft, setDraft] = useState(user);
  const st = accessStatus(draft, now);
  const plan = plans.find((p) => p.id === draft.planId);
  const totalScreens = (plan?.screens ?? 0) + draft.extraScreens;
  const set = (patch: Partial<AdminUser>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Drawer
      open
      onClose={onClose}
      title="Detalhes do usuário"
      footer={
        <>
          <Button className="flex-1" disabled={saving} onClick={() => onUpdate(draft, "Alterações salvas")}>
            {saving && <Loader2 className="animate-spin" />} Salvar alterações
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-4">
        <span className="font-display flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-xl font-extrabold">
          {draft.name[0]}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{draft.name}</p>
          <p className="truncate text-sm text-fg-muted">{draft.email}</p>
          <div className="mt-1.5">
            <Badge tone={statusTone[st]}>{statusLabel[st]}</Badge>
          </div>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-line bg-ink-850/60 p-4 text-sm">
        <div>
          <dt className="text-xs text-fg-subtle">Cliente desde</dt>
          <dd className="font-semibold">{formatDate(draft.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-fg-subtle">Último acesso</dt>
          <dd className="font-semibold">{formatRelative(draft.lastSeenAt, now)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-fg-subtle">Telas em uso agora</dt>
          <dd className="flex items-center gap-1.5 font-semibold">
            <MonitorPlay className="size-4 text-brand-300" /> {draft.activeScreens} de {totalScreens || "—"}
          </dd>
        </div>
      </dl>

      <h3 className="mt-7 mb-3 text-xs font-bold tracking-wider text-fg-subtle uppercase">Acesso</h3>
      <div className="space-y-4">
        <SelectInput
          label="Plano"
          value={draft.planId ?? ""}
          onChange={(e) => {
            const p = plans.find((x) => x.id === e.target.value);
            set({
              planId: p?.id,
              lifetime: p?.type === "vitalicio",
              expiresAt: p?.type === "recorrente" ? draft.expiresAt ?? addDays(undefined, p.durationDays ?? 30, now) : undefined,
            });
          }}
        >
          <option value="">Sem plano</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {!p.active ? " (inativo)" : ""}
            </option>
          ))}
        </SelectInput>

        {draft.planId && (
          <>
            <Toggle
              checked={draft.lifetime}
              onChange={(v) => set({ lifetime: v, expiresAt: v ? undefined : addDays(undefined, 30, now) })}
              label="Acesso vitalício"
              description="Nunca expira, independentemente do plano"
            />
            {!draft.lifetime && (
              <div>
                <TextInput
                  label="Válido até"
                  type="date"
                  value={toInputDate(draft.expiresAt)}
                  onChange={(e) => set({ expiresAt: fromInputDate(e.target.value) })}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {[30, 90, 365].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => set({ expiresAt: addDays(draft.expiresAt, d, now) })}
                      className="flex h-8 items-center gap-1 rounded-lg bg-white/[0.06] px-2.5 text-xs font-semibold text-fg-muted ring-1 ring-white/10 hover:text-fg"
                    >
                      <CalendarPlus className="size-3.5" /> +{d} dias
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <FormField label="Telas extras" hint={`Plano: ${plan?.screens ?? 0} · Total liberado: ${totalScreens}`}>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Menos" onClick={() => set({ extraScreens: Math.max(0, draft.extraScreens - 1) })}>
              <Minus />
            </Button>
            <span className="font-display w-10 text-center text-xl font-extrabold">+{draft.extraScreens}</span>
            <Button variant="outline" size="icon" aria-label="Mais" onClick={() => set({ extraScreens: Math.min(10, draft.extraScreens + 1) })}>
              <Plus />
            </Button>
          </div>
        </FormField>
      </div>

      <h3 className="mt-7 mb-3 text-xs font-bold tracking-wider text-fg-subtle uppercase">Ações</h3>
      <div className="grid gap-2">
        {draft.suspended ? (
          <Button variant="outline" onClick={() => onUpdate({ ...draft, suspended: false }, `${draft.name} reativado`)}>
            <Unlock /> Reativar acesso
          </Button>
        ) : (
          <Button
            variant="danger"
            disabled={draft.isAdmin || saving}
            onClick={() => onUpdate({ ...draft, suspended: true }, `${draft.name} suspenso`)}
          >
            <Ban /> Suspender acesso
          </Button>
        )}
        {draft.activeScreens > 0 && (
          <Button variant="ghost" onClick={() => onUpdate({ ...draft, activeScreens: 0 }, "Todas as telas foram desconectadas", "telas")}>
            <MonitorPlay /> Desconectar todas as telas
          </Button>
        )}
      </div>
    </Drawer>
  );
}

function GrantModal({
  plans,
  now,
  onClose,
  onGrant,
}: {
  plans: Plan[];
  now: Date;
  onClose: () => void;
  /** Retorna uma mensagem de erro, se houver */
  onGrant: (u: AdminUser) => Promise<string | undefined | void>;
}) {
  const [busy, setBusy] = useState(false);
  const active = plans.filter((p) => p.active);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [planId, setPlanId] = useState(active[0]?.id ?? "");
  const [error, setError] = useState("");
  const plan = plans.find((p) => p.id === planId);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Informe um e-mail válido.");
    if (!planId) return setError("Cadastre um plano ativo primeiro (menu Planos).");
    setBusy(true);
    const err = await onGrant({
      id: `u-${Date.now()}`,
      name: name.trim() || email.split("@")[0],
      email: email.trim().toLowerCase(),
      createdAt: now.toISOString(),
      planId,
      lifetime: plan?.type === "vitalicio",
      expiresAt: plan?.type === "recorrente" ? addDays(undefined, plan.durationDays ?? 30, now) : undefined,
      suspended: false,
      extraScreens: 0,
      activeScreens: 0,
    });
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Liberar acesso manualmente"
      description="Use enquanto o pagamento automático não está ativo."
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />} Liberar acesso
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextInput
          label="E-mail do cliente"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          placeholder="cliente@email.com"
          error={error}
          hint="Se ainda não tiver conta, ela é criada na hora. A pessoa entra só com este e-mail."
          autoFocus
        />
        <TextInput label="Nome (opcional)" value={name} onChange={(e) => setName(e.target.value)} />
        <SelectInput label="Plano" value={planId} onChange={(e) => setPlanId(e.target.value)}>
          {active.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.type === "vitalicio" ? "vitalício" : `${p.durationDays} dias`} · {p.screens}{" "}
              {p.screens === 1 ? "tela" : "telas"}
            </option>
          ))}
        </SelectInput>
      </div>
    </Modal>
  );
}
