"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Save, Star, X } from "lucide-react";
import { Artwork } from "@/components/catalog/Artwork";
import { Button } from "@/components/ui/Button";
import { AdminHeader, Panel, SelectInput, TextInput, Toggle, useToast } from "@/components/admin/ui";

type FeaturedItem = { slug: string; title: string; artSeed: number; posterUrl?: string };

/** CONFIGURAÇÕES — dados da plataforma, destaques da home e regras de acesso. */
export function SettingsManager({
  featured: initialFeatured,
  candidates,
}: {
  featured: FeaturedItem[];
  candidates: FeaturedItem[];
}) {
  const toast = useToast();
  const [name, setName] = useState("Dorama LGBT");
  const [supportEmail, setSupportEmail] = useState("suporte@doramalgbt.com");
  const [announcement, setAnnouncement] = useState("");
  const [signupOpen, setSignupOpen] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [rotation, setRotation] = useState("8");
  const [featured, setFeatured] = useState(initialFeatured);

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
          <Button size="sm" onClick={() => toast("Configurações salvas")}>
            <Save /> Salvar
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
              label="Aviso no topo do app (opcional)"
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="Ex.: Novo episódio de Amor em Seul toda sexta!"
            />
          </div>
        </Panel>

        <Panel title="Acesso e reprodução">
          <div className="space-y-5">
            <Toggle
              checked={signupOpen}
              onChange={setSignupOpen}
              label="Cadastro aberto"
              description="Permite que novas pessoas criem conta"
            />
            <Toggle
              checked={autoplayNext}
              onChange={setAutoplayNext}
              label="Próximo episódio automático"
              description="Começa o próximo episódio ao terminar o atual"
            />
            <Toggle
              checked={maintenance}
              onChange={setMaintenance}
              label="Modo manutenção"
              description="Clientes veem um aviso; o painel continua funcionando"
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
