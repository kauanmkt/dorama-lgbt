import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cable, ExternalLink, Lock, MonitorPlay, Smartphone, Tv, Wifi } from "lucide-react";
import { SubPage } from "@/components/account/SubPage";
import { getMyTvAccess, getSessionUser } from "@/lib/auth";
import { getPublicSetting } from "@/lib/settings";
import { SiteHost } from "./SiteHost";

export const metadata: Metadata = { title: "Assistir na TV" };

export default function TvPage() {
  return (
    <SubPage title="Assistir na TV" description="Veja seus doramas na tela grande, do jeito que for mais fácil para você.">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-ink-850" />}>
        <Content />
      </Suspense>
    </SubPage>
  );
}

async function Content() {
  const [allowed, url, user] = await Promise.all([getMyTvAccess(), getPublicSetting<string>("tv_upgrade_url"), getSessionUser()]);
  return allowed ? <Tutorial /> : <Locked url={url?.trim() || null} email={user?.email ?? null} />;
}

function Locked({ url, email }: { url: string | null; email: string | null }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-500/40 bg-gradient-to-br from-brand-900/60 to-ink-900 p-6 text-center">
      <span className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-600">
        <Tv className="size-8" aria-hidden="true" />
        <span className="absolute -right-1.5 -bottom-1.5 flex size-7 items-center justify-center rounded-full bg-ink-900 ring-2 ring-brand-500">
          <Lock className="size-3.5" aria-hidden="true" />
        </span>
      </span>
      <h2 className="mt-4 text-xl font-extrabold">Assista na televisão</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-fg-muted">
        Libere o passo a passo para ver a Amora na sua TV: pelo celular (iPhone ou Android), pelo navegador da Smart TV ou
        com cabo.
      </p>
      {url ? (
        <>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 font-bold transition hover:bg-brand-500"
          >
            Liberar agora <ExternalLink className="size-4" aria-hidden="true" />
          </a>
          {email && (
            <p className="mt-3 text-xs text-fg-muted">
              No pagamento, use o mesmo e-mail da sua conta: <strong className="break-all text-fg">{email}</strong>
            </p>
          )}
        </>
      ) : (
        <Link href="/perfil/suporte" className="mt-5 inline-block text-sm font-bold text-brand-300 hover:underline">
          Quero liberar: falar com o suporte
        </Link>
      )}
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold" aria-hidden="true">
        {n}
      </span>
      <span className="text-sm text-fg-muted">{children}</span>
    </li>
  );
}

function Method({ icon: Icon, title, works, children }: { icon: typeof Tv; title: string; works: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-ink-900/60 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-900/70 text-brand-300">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-0.5 text-xs text-fg-subtle">{works}</p>
        </div>
      </div>
      <ol className="mt-4 space-y-3">{children}</ol>
    </section>
  );
}

function Tutorial() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl bg-ink-850 p-4 text-sm">
        <Wifi className="mt-0.5 size-5 shrink-0 text-brand-300" aria-hidden="true" />
        <p className="text-fg-muted">
          <strong className="text-fg">Antes de tudo:</strong> deixe o celular e a TV conectados <strong className="text-fg">no mesmo Wi-Fi</strong>.
        </p>
      </div>

      <Method icon={Smartphone} title="iPhone (AirPlay)" works="Apple TV e TVs compatíveis com AirPlay (muitas Samsung, LG e Sony recentes)">
        <Step n={1}>Abra a <strong className="text-fg">Central de Controle</strong>: deslize o dedo de cima para baixo no canto direito da tela.</Step>
        <Step n={2}>Toque em <strong className="text-fg">Espelhar Tela</strong> e escolha a sua TV. Se aparecer um código na TV, digite no iPhone.</Step>
        <Step n={3}>Abra a Amora, dê o play e gire o celular para a tela cheia.</Step>
      </Method>

      <Method icon={Smartphone} title="Android (Chromecast / Smart View)" works="Chromecast, Google TV, Android TV e TVs com Chromecast integrado ou Smart View">
        <Step n={1}>Deslize o dedo de cima para baixo para abrir as <strong className="text-fg">configurações rápidas</strong>.</Step>
        <Step n={2}>
          Toque em <strong className="text-fg">Transmitir tela</strong>, <strong className="text-fg">Smart View</strong> ou{" "}
          <strong className="text-fg">Espelhar tela</strong> (o nome muda conforme a marca do celular) e escolha a sua TV.
        </Step>
        <Step n={3}>Abra a Amora, dê o play e gire o celular para a tela cheia.</Step>
      </Method>

      <Method icon={MonitorPlay} title="Pelo navegador da Smart TV" works="Qualquer Smart TV com navegador de internet">
        <Step n={1}>Na TV, abra o navegador (na Samsung se chama “Internet”; na LG, “Navegador Web”).</Step>
        <Step n={2}>
          Digite o endereço <SiteHost /> e entre com o <strong className="text-fg">mesmo e-mail da sua compra</strong>.
        </Step>
        <Step n={3}>Escolha o dorama e dê o play. A TV conta como um dos aparelhos conectados do seu plano.</Step>
      </Method>

      <Method icon={Cable} title="Com cabo HDMI" works="Notebook ou computador ligado na TV">
        <Step n={1}>Ligue o notebook na TV com um cabo HDMI e escolha a entrada HDMI no controle da TV.</Step>
        <Step n={2}>Abra a Amora no navegador do notebook, dê o play e coloque em tela cheia.</Step>
      </Method>

      <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-fg-muted">
        <strong className="text-fg">A TV não aparece na lista?</strong> Confira se os dois estão no mesmo Wi-Fi, desligue e ligue a TV
        e tente de novo. Se não der certo,{" "}
        <Link href="/perfil/suporte" className="font-bold text-brand-300 hover:underline">
          fale com o suporte
        </Link>
        .
      </div>
    </div>
  );
}
