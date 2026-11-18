"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { BellOff, BellRing, Check, Loader2, Share, Smartphone } from "lucide-react";
import { Toggle } from "@/components/admin/ui";
import { salvarPreferencias, testarPush, type Prefs } from "@/lib/notification-actions";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push-client";

const PREF_LABELS: { key: keyof Prefs; label: string; description: string }[] = [
  { key: "lancamentos", label: "Lançamentos", description: "Quando chegar dorama novo na Amora." },
  { key: "continuar", label: "Continuar assistindo", description: "Lembrete para terminar o dorama que você parou no meio." },
  { key: "saudade", label: "Novidades da semana", description: "Quando você ficar uns dias sem aparecer, avisamos o que chegou." },
  { key: "avisos", label: "Avisos e promoções", description: "Recados importantes da Amora." },
  { key: "suporte", label: "Respostas do suporte", description: "Quando o suporte responder sua mensagem." },
];

const box = "rounded-2xl border border-line bg-ink-900/60 p-5";

export function PushSettings({ initialPrefs }: { initialPrefs: Prefs }) {
  const [state, setState] = useState<PushState>("carregando");
  const [prefs, setPrefs] = useState(initialPrefs);
  const [busy, start] = useTransition();
  const [tested, setTested] = useState<string | null>(null);

  useEffect(() => {
    getPushState().then(setState);
  }, []);

  const change = (key: keyof Prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    salvarPreferencias(next).catch(() => {});
  };

  return (
    <>
      <section className={box}>
        {state === "carregando" && (
          <div className="flex items-center gap-3 text-fg-muted">
            <Loader2 className="size-5 animate-spin" /> Verificando este aparelho…
          </div>
        )}

        {state === "desligado" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <BellRing className="mt-0.5 size-6 shrink-0 text-brand-300" aria-hidden="true" />
              <div>
                <p className="font-bold">Receba as novidades no celular</p>
                <p className="mt-1 text-sm text-fg-muted">
                  Toque no botão e depois em <strong className="text-fg">Permitir</strong> na mensagem que vai aparecer.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => start(async () => setState(await enablePush().catch(() => "desligado" as const)))}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 font-bold transition hover:bg-brand-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-5 animate-spin" /> : <BellRing className="size-5" aria-hidden="true" />}
              Ativar notificações
            </button>
          </div>
        )}

        {state === "ligado" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                <Check className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-bold">Notificações ativadas neste aparelho</p>
                <p className="mt-1 text-sm text-fg-muted">Escolha abaixo o que você quer receber.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  start(async () => {
                    const r = await testarPush().catch(() => ({ ok: false, devices: 0 }));
                    setTested(r.devices > 0 ? "Enviamos uma notificação de teste. Ela deve chegar em alguns segundos." : "Não conseguimos enviar agora. Tente desativar e ativar de novo.");
                  })
                }
                className="rounded-full border border-line px-4 py-2 text-sm font-bold transition hover:bg-white/5 disabled:opacity-60"
              >
                Enviar um teste
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => start(async () => setState(await disablePush()))}
                className="rounded-full px-4 py-2 text-sm font-bold text-fg-muted transition hover:bg-white/5 hover:text-fg disabled:opacity-60"
              >
                Desativar neste aparelho
              </button>
            </div>
            {tested && <p className="text-sm text-fg-muted">{tested}</p>}
          </div>
        )}

        {state === "instalar-iphone" && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Smartphone className="mt-0.5 size-6 shrink-0 text-brand-300" aria-hidden="true" />
              <div>
                <p className="font-bold">No iPhone, instale o app primeiro</p>
                <p className="mt-1 text-sm text-fg-muted">
                  O iPhone só entrega notificações para o app instalado na tela de início.
                </p>
              </div>
            </div>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-fg-muted">
              <li>
                No Safari, toque em <Share className="inline size-4 align-text-bottom" aria-label="Compartilhar" /> Compartilhar.
              </li>
              <li>Toque em “Adicionar à Tela de Início” e depois em “Adicionar”.</li>
              <li>Abra a Amora pelo ícone novo e volte aqui em Perfil → Notificações.</li>
            </ol>
            <Link href="/perfil/instalar" className="inline-block text-sm font-bold text-brand-300 hover:underline">
              Ver o passo a passo com detalhes
            </Link>
          </div>
        )}

        {state === "bloqueado" && (
          <div className="flex items-start gap-3">
            <BellOff className="mt-0.5 size-6 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <p className="font-bold">As notificações estão bloqueadas</p>
              <p className="mt-1 text-sm text-fg-muted">
                Você recusou a permissão antes. Para liberar: abra os <strong className="text-fg">Ajustes do celular</strong> →
                Notificações → Amora (ou, no navegador, toque no cadeado ao lado do endereço → Notificações → Permitir). Depois
                volte aqui.
              </p>
            </div>
          </div>
        )}

        {state === "sem-suporte" && (
          <div className="flex items-start gap-3">
            <BellOff className="mt-0.5 size-6 shrink-0 text-fg-subtle" aria-hidden="true" />
            <div>
              <p className="font-bold">Este navegador não recebe notificações</p>
              <p className="mt-1 text-sm text-fg-muted">
                Instale o app da Amora no celular (Android pelo Chrome, iPhone pelo Safari) para receber as novidades.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className={box}>
        <h2 className="font-bold">O que você quer receber</h2>
        <p className="mt-1 text-sm text-fg-muted">Vale para o celular e para o sino aqui do site.</p>
        <div className="mt-5 space-y-5">
          {PREF_LABELS.map((p) => (
            <Toggle key={p.key} checked={prefs[p.key]} onChange={(v) => change(p.key, v)} label={p.label} description={p.description} />
          ))}
        </div>
      </section>
    </>
  );
}
