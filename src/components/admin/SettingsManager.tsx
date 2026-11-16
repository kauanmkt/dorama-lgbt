"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Save, Star, X } from "lucide-react";
import { Artwork } from "@/components/catalog/Artwork";
import { Button } from "@/components/ui/Button";
import { AdminHeader, Panel, SelectInput, TextInput, Toggle, useToast } from "@/components/admin/ui";
import { salvarConfiguracoes, type SettingsInput } from "@/lib/content-actions";

type FeaturedItem = { id: string; slug: string; title: string; artSeed: number; posterUrl?: string };

export type SettingsValues = Omit<SettingsInput, "featuredIds">;

/** CONFIGURAÇÕES — dados da plataforma, destaques da home e regras de acesso. */
export function SettingsManager({
  values,
  featured: initialFeatured,
  candidates,
}: {
  values: SettingsValues;
  featured: FeaturedItem[];
  candidates: FeaturedItem[];
}) {
  const toast = useToast();
  const [name, setName] = useState(values.platformName);
  const [supportEmail, setSupportEmail] = useState(values.supportEmail);
  const [announcement, setAnnouncement] = useState(values.announcement);
  const [purchaseUrl, setPurchaseUrl] = useState(values.purchaseUrl);
  const [upgradeUrl, setUpgradeUrl] = useState(values.upgradeUrl);
  const [maintenance, setMaintenance] = useState(values.maintenance);
  const [rotation, setRotation] = useState(String(values.heroRotation));
  const [featured, setFeatured] = useState(initialFeatured);
  const [extraIds, setExtraIds] = useState(values.extraScreenIds.join(", "));
  const [saving, startSaving] = useTransition();

  const save = () =>
    startSaving(async () => {
      const r = await salvarConfiguracoes({
        platformName: name,
        supportEmail,
        announcement,
        purchaseUrl,
        upgradeUrl,
        maintenance,
        autoplayNext: values.autoplayNext,
        heroRotation: Number(rotation),
        extraScreenIds: extraIds.split(/[\s,;]+/).filter(Boolean),
        featuredIds: featured.map((f) => f.id),
      });
      if (r.ok) toast(r.message ?? "Configurações salvas");
      else toast(r.error, "error");
    });

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= featured.length) return;
    const next = [...featured];
    [next[i], next[j]] = [next[j], next[i]];
    setFeatured(next);
  };

  const available = candidates.filter((c) => !featured.some((f) => f.slug === c.slug));

  return (
    <>
      <AdminHeader
        title="Configurações"
        description="Ajustes gerais da plataforma."
        actions={
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar
          </Button>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2">
        <Panel title="Plataforma">
          <div className="space-y-4">
            <TextInput label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
            <TextInput
              label="E-mail de suporte"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              hint="Aparece na tela de ajuda e nos e-mails enviados aos clientes"
            />
            <TextInput
              label="Aviso para os clientes (opcional)"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="Ex.: Novo dorama toda sexta!"
              maxLength={160}
            />
            <TextInput
              label="Link da página de compra"
              type="url"
              value={purchaseUrl}
              onChange={(e) => setPurchaseUrl(e.target.value)}
              placeholder="https://pay.suaplataforma.com/..."
              hint="Aparece para quem tenta entrar sem ter um plano ativo"
            />
            <TextInput
              label="Link de checkout do upgrade de telas"
              type="url"
              value={upgradeUrl}
              onChange={(e) => setUpgradeUrl(e.target.value)}
              placeholder="https://pay.lowify.com.br/..."
              hint="Aparece como botão “Adicionar telas” em Perfil → Telas conectadas"
            />
            <TextInput
              label="IDs dos produtos de tela extra na Lowify (order bump e upgrade)"
              value={extraIds}
              onChange={(e) => setExtraIds(e.target.value)}
              placeholder="Ex.: 68512, 68530"
              hint="Separe por vírgula. Cada compra de um desses produtos soma +1 tela ao cliente do mesmo e-mail (e o reembolso tira)"
            />
          </div>
        </Panel>

        <Panel title="Acesso e reprodução">
          <div className="space-y-5">
            <Toggle
              checked={maintenance}
              onChange={setMaintenance}
              label="Modo manutenção"
              description="Quem tentar assistir vê um aviso; o painel continua funcionando"
            />
            {maintenance && (
              <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs font-semibold text-warning ring-1 ring-warning/25">
                Atenção: com o modo manutenção ligado, ninguém consegue assistir.
              </p>
            )}
          </div>
        </Panel>

        <Panel
          title="Destaques da página inicial"
          description="Ordem em que aparecem no banner principal."
          className="lg:col-span-2"
        >
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
            <ol className="space-y-2">
              {featured.map((f, i) => (
                <li key={f.slug} className="flex items-center gap-3 rounded-xl border border-line bg-ink-850/60 p-2 pr-3">
                  <span className="font-display w-6 text-center text-lg font-bold text-fg-subtle">{i + 1}</span>
                  <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md">
                    <Artwork seed={f.artSeed} title={f.title} imageUrl={f.posterUrl} showTitle={false} />
                  </div>
                  <p className="min-w-0 flex-1 truncate font-bold">{f.title}</p>
                  <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-white/10 disabled:opacity-25">
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" aria-label="Descer" disabled={i === featured.length - 1} onClick={() => move(i, 1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-white/10 disabled:opacity-25">
                    <ArrowDown className="size-4" />
                  </button>
                  <button type="button" aria-label="Remover dos destaques" onClick={() => setFeatured(featured.filter((x) => x.slug !== f.slug))} className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-danger/15 hover:text-danger">
                    <X className="size-4" />
                  </button>
                </li>
              ))}
              {featured.length === 0 && (
                <li className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-fg-muted">
                  Nenhum destaque. O banner some da página inicial.
                </li>
              )}
            </ol>

            <div className="space-y-4">
              <SelectInput
                label="Adicionar destaque"
                value=""
                onChange={(e) => {
                  const c = candidates.find((x) => x.slug === e.target.value);
                  if (c) setFeatured([...featured, c]);
                }}
              >
                <option value="">Escolha um dorama…</option>
                {available.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </SelectInput>
              <SelectInput label="Trocar destaque a cada" value={rotation} onChange={(e) => setRotation(e.target.value)}>
                <option value="6">6 segundos</option>
                <option value="8">8 segundos</option>
                <option value="12">12 segundos</option>
                <option value="0">Não trocar sozinho</option>
              </SelectInput>
              <p className="flex items-start gap-2 text-xs text-fg-subtle">
                <Star className="mt-0.5 size-3.5 shrink-0 text-warning" />
                Também dá para marcar destaques direto na lista de doramas, pela estrela.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
