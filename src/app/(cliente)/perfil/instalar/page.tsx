import type { Metadata } from "next";
import { Card, SubPage } from "@/components/account/SubPage";
import { InstallButton } from "./InstallButton";

export const metadata: Metadata = { title: "Instalar o app" };

const steps = {
  iphone: [
    "Abra este site no Safari (o navegador da bússola azul).",
    "Toque no botão Compartilhar (o quadrado com a setinha para cima), na barra de baixo.",
    "Role a lista e toque em “Adicionar à Tela de Início”.",
    "Toque em “Adicionar”. Pronto: o ícone da Amora aparece junto dos seus apps.",
  ],
  android: [
    "Abra este site no Chrome.",
    "Toque nos três pontinhos (⋮) no canto de cima.",
    "Toque em “Instalar app” ou “Adicionar à tela inicial”.",
    "Confirme em “Instalar”. O ícone da Amora aparece junto dos seus apps.",
  ],
};

export default function InstallPage() {
  return (
    <SubPage
      title="Instalar o app no celular"
      description="O app abre em tela cheia, como os outros apps do celular, e não ocupa quase nada de espaço."
    >
      <InstallButton />
      <Card>
        <h2 className="font-bold">iPhone</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-fg-muted">
          {steps.iphone.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Card>
      <Card>
        <h2 className="font-bold">Android</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-fg-muted">
          {steps.android.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Card>
      <p className="text-xs text-fg-subtle">Depois de instalar, entre com o mesmo e-mail da compra.</p>
    </SubPage>
  );
}
