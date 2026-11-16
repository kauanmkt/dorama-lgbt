import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, SubPage } from "@/components/account/SubPage";
import { getMyAccess, getMyProfile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { NameForm } from "./NameForm";

export const metadata: Metadata = { title: "Dados da conta" };

export default function AccountPage() {
  return (
    <SubPage title="Dados da conta">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-ink-850" />}>
        <AccountContent />
      </Suspense>
    </SubPage>
  );
}

async function AccountContent() {
  const [profile, access] = await Promise.all([getMyProfile(), getMyAccess()]);
  return (
    <>
      <Card>
        <NameForm initial={profile?.name ?? ""} />
      </Card>
      <Card>
        <p className="text-sm font-semibold text-fg-muted">E-mail de acesso</p>
        <p className="mt-1 font-bold break-all">{profile?.email}</p>
        <p className="mt-2 text-xs text-fg-subtle">
          É o e-mail usado na compra e o que você digita para entrar. Para trocar, fale com o suporte em Ajuda.
        </p>
      </Card>
      <Card>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-fg-subtle">Plano</dt>
            <dd className="mt-0.5 font-bold">{access.planName ?? "Nenhum plano"}</dd>
          </div>
          <div>
            <dt className="text-fg-subtle">Situação</dt>
            <dd className="mt-0.5 font-bold">{access.hasAccess ? "Ativo" : access.status === "suspensa" ? "Suspenso" : "Inativo"}</dd>
          </div>
          <div>
            <dt className="text-fg-subtle">Válido até</dt>
            <dd className="mt-0.5 font-bold">{access.lifetime ? "Para sempre (vitalício)" : formatDate(access.expiresAt)}</dd>
          </div>
          <div>
            <dt className="text-fg-subtle">Aparelhos conectados</dt>
            <dd className="mt-0.5 font-bold">{access.screens || "—"}</dd>
          </div>
        </dl>
      </Card>
    </>
  );
}
