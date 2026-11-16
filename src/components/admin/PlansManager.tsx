"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Infinity as InfinityIcon, Link2, Minus, MonitorPlay, Pencil, Plus, RefreshCw, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AdminHeader, FormField, Modal, SelectInput, TextArea, TextInput, Toggle, useToast } from "@/components/admin/ui";
import { alternarPlano, salvarPlano } from "@/lib/admin-actions";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Plan, PlanType } from "@/types/admin";

const durations = [
  { days: 30, label: "Mensal (30 dias)" },
  { days: 90, label: "Trimestral (90 dias)" },
  { days: 180, label: "Semestral (180 dias)" },
  { days: 365, label: "Anual (365 dias)" },
];

const periodLabel = (p: Plan) =>
  p.type === "vitalicio"
    ? "pagamento único"
    : p.durationDays === 30
      ? "por mês"
      : p.durationDays === 365
        ? "por ano"
        : `a cada ${p.durationDays} dias`;

/** PLANOS — criar e editar os planos de acesso. */
export function PlansManager({ initial, subscribers }: { initial: Plan[]; subscribers: Record<string, number> }) {
  const toast = useToast();
  const router = useRouter();
  const [plans, setPlans] = useState(initial);
  const [editing, setEditing] = useState<Plan | "new" | null>(null);

  return (
    <>
      <AdminHeader
        title="Planos"
        description="Defina preços, duração e quantas telas cada plano permite."
        actions={
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus /> Novo plano
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <article
            key={p.id}
            className={cn(
              "relative flex flex-col rounded-2xl border bg-ink-900/70 p-5 transition-colors",
              p.highlight ? "border-brand-500/60 shadow-[0_0_40px_-18px] shadow-brand-500" : "border-line",
              !p.active && "opacity-60",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-extrabold">{p.name}</h2>
                <p className="mt-0.5 text-sm text-fg-muted">{p.description}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {!p.active && <Badge>Inativo</Badge>}
                {p.highlight && (
                  <Badge tone="brand">
                    <Sparkles className="size-3" /> Destaque
                  </Badge>
                )}
              </div>
            </div>

            <p className="mt-5">
              <span className="font-display text-3xl font-extrabold">{formatBRL(p.priceCents)}</span>
              <span className="ml-1.5 text-sm text-fg-subtle">{periodLabel(p)}</span>
            </p>

            <ul className="mt-5 space-y-2 text-sm text-fg-muted">
              <li className="flex items-center gap-2">
                {p.type === "vitalicio" ? <InfinityIcon className="size-4 text-brand-300" /> : <RefreshCw className="size-4 text-brand-300" />}
                {p.type === "vitalicio" ? "Acesso vitalício" : `Renova a cada ${p.durationDays} dias`}
              </li>
              <li className="flex items-center gap-2">
                <MonitorPlay className="size-4 text-brand-300" />
                {p.screens} {p.screens === 1 ? "tela simultânea" : "telas simultâneas"}
              </li>
              <li className={`flex items-center gap-2 ${p.productIds?.length ? "" : "text-warning"}`}>
                <Link2 className="size-4 text-brand-300" />
                {p.productIds?.length ? `Lowify: produto ${p.productIds.join(", ")}` : "Sem produto da Lowify ligado"}
              </li>
              <li className="flex items-center gap-2">
                <Users className="size-4 text-brand-300" />
                {subscribers[p.id] ?? 0} assinantes
              </li>
            </ul>

            <div className="mt-6 flex items-center gap-2 border-t border-line pt-4">
              <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                <Pencil /> Editar
              </Button>
              <button
                type="button"
                onClick={async () => {
                  const res = await alternarPlano(p.id, !p.active);
                  if (!res.ok) return toast(res.error, "error");
                  setPlans((l) => l.map((x) => (x.id === p.id ? { ...x, active: !x.active } : x)));
                  toast(p.active ? `Plano “${p.name}” desativado` : `Plano “${p.name}” ativado`);
                  router.refresh();
                }}
                className="ml-auto text-xs font-semibold text-fg-subtle hover:text-fg"
              >
                {p.active ? "Desativar" : "Ativar"}
              </button>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs text-fg-subtle">
        Desativar um plano só impede novas assinaturas — quem já assinou continua com acesso até o fim do período.
      </p>

      {editing && (
        <PlanModal
          initial={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={async (plan) => {
            const isNew = editing === "new";
            const res = await salvarPlano({ ...plan, isNew });
            if (!res.ok) return toast(res.error, "error");
            const saved = { ...plan, id: res.id ?? plan.id };
            setPlans((l) => (l.some((x) => x.id === saved.id) ? l.map((x) => (x.id === saved.id ? saved : x)) : [...l, saved]));
            toast(isNew ? `Plano “${plan.name}” criado` : "Plano atualizado");
            router.refresh();
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function PlanModal({ initial, onClose, onSave }: { initial?: Plan; onClose: () => void; onSave: (p: Plan) => void | Promise<void> }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? (initial.priceCents / 100).toFixed(2).replace(".", ",") : "");
  const [type, setType] = useState<PlanType>(initial?.type ?? "recorrente");
  const [duration, setDuration] = useState(initial?.durationDays ?? 30);
  const [screens, setScreens] = useState(initial?.screens ?? 1);
  const [active, setActive] = useState(initial?.active ?? true);
  const [highlight, setHighlight] = useState(initial?.highlight ?? false);
  const [productIds, setProductIds] = useState((initial?.productIds ?? []).join(", "));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const cents = Math.round(Number(price.replace(/\./g, "").replace(",", ".")) * 100);
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Dê um nome ao plano.";
    if (!Number.isFinite(cents) || cents <= 0) e.price = "Informe um preço válido.";
    if (type === "recorrente" && (!duration || duration < 1)) e.duration = "Informe a duração.";
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave({
      id: initial?.id ?? `plano-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      priceCents: cents,
      type,
      durationDays: type === "recorrente" ? duration : undefined,
      screens,
      active,
      highlight,
      productIds: productIds.split(/[\s,;]+/).filter(Boolean),
    });
  };

  const isPreset = durations.some((d) => d.days === duration);

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? `Editar plano ${initial.name}` : "Novo plano"}
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button size="sm" onClick={submit}>
            Salvar plano
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Mensal" error={errors.name} autoFocus />
        <TextInput
          label="Preço (R$)"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^\d,.]/g, ""))}
          placeholder="19,90"
          error={errors.price}
        />
        <TextArea
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          wrapperClassName="sm:col-span-2"
          placeholder="Uma linha explicando o plano"
        />

        <FormField label="Tipo" className="sm:col-span-2">
          <div className="grid grid-cols-2 gap-2">
            {(["recorrente", "vitalicio"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  type === t ? "border-brand-500 bg-brand-600/10" : "border-line hover:border-ink-600",
                )}
              >
                {t === "recorrente" ? <RefreshCw className="size-5 text-brand-300" /> : <InfinityIcon className="size-5 text-brand-300" />}
                <span>
                  <span className="block text-sm font-bold">{t === "recorrente" ? "Com prazo" : "Vitalício"}</span>
                  <span className="block text-xs text-fg-subtle">
                    {t === "recorrente" ? "Expira e pode ser renovado" : "Nunca expira"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </FormField>

        {type === "recorrente" && (
          <>
            <SelectInput
              label="Duração"
              value={isPreset ? duration : "custom"}
              onChange={(e) => setDuration(e.target.value === "custom" ? 60 : Number(e.target.value))}
            >
              {durations.map((d) => (
                <option key={d.days} value={d.days}>
                  {d.label}
                </option>
              ))}
              <option value="custom">Personalizada</option>
            </SelectInput>
            {!isPreset ? (
              <TextInput
                label="Dias"
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                error={errors.duration}
              />
            ) : (
              <div className="hidden sm:block" />
            )}
          </>
        )}

        <FormField label="Telas simultâneas" hint="Quantos aparelhos podem assistir ao mesmo tempo">
          <div className="flex h-11 items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Menos" onClick={() => setScreens((s) => Math.max(1, s - 1))}>
              <Minus />
            </Button>
            <span className="font-display w-10 text-center text-xl font-extrabold">{screens}</span>
            <Button variant="outline" size="icon" aria-label="Mais" onClick={() => setScreens((s) => Math.min(10, s + 1))}>
              <Plus />
            </Button>
          </div>
        </FormField>

        <div className="sm:col-span-2">
          <TextInput
            label="ID do produto na Lowify"
            value={productIds}
            onChange={(e) => setProductIds(e.target.value)}
            placeholder="Ex.: 42 (vários: separe por vírgula)"
            hint="Quem comprar este produto na Lowify recebe este plano automaticamente"
          />
        </div>

        <div className="space-y-4 sm:col-span-2">
          <Toggle checked={active} onChange={setActive} label="Plano ativo" description="Disponível para novas assinaturas" />
          <Toggle checked={highlight} onChange={setHighlight} label="Destacar este plano" description="Aparece como recomendado na página de planos" />
        </div>
      </div>
    </Modal>
  );
}
