import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { Card, SubPage } from "@/components/account/SubPage";
import { getPublicSetting } from "@/lib/settings";

export const metadata: Metadata = { title: "Ajuda" };

const faq = [
  {
    q: "Como eu entro na minha conta?",
    a: "Digite o mesmo e-mail que você usou na compra. Não tem senha: se o seu plano estiver ativo, você entra na hora.",
  },
  {
    q: "Paguei, mas não consigo entrar. E agora?",
    a: "O acesso é liberado assim que o pagamento é aprovado. Pix e cartão costumam aprovar em segundos; boleto pode levar até 2 dias úteis. Confira se digitou o e-mail exatamente como na compra.",
  },
  {
    q: "Apareceu “limite de telas atingido”.",
    a: "Seu plano permite um número de aparelhos assistindo ao mesmo tempo. Feche o vídeo no outro aparelho ou vá em Perfil → Telas conectadas e desconecte o aparelho que não está usando.",
  },
  {
    q: "O vídeo não carrega ou fica travando.",
    a: "Confira sua internet, feche e abra o vídeo de novo. Ele continua de onde você parou. Se continuar, fale com a gente pelo e-mail abaixo dizendo o nome do dorama.",
  },
  {
    q: "Como renovo ou cancelo?",
    a: "O plano mensal é renovado pela plataforma de pagamento onde você comprou. Para cancelar, use o link do e-mail de compra ou fale com o suporte. O vitalício não precisa renovar.",
  },
];

export default async function HelpPage() {
  const email = (await getPublicSetting<string>("support_email"))?.trim();
  return (
    <SubPage title="Ajuda" description="Respostas rápidas para as dúvidas mais comuns.">
      <div className="space-y-3">
        {faq.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-line bg-ink-900/60 p-5 open:border-brand-600/40">
            <summary className="cursor-pointer list-none font-semibold marker:hidden">
              <span className="mr-2 inline-block text-brand-300 transition group-open:rotate-90">›</span>
              {f.q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">{f.a}</p>
          </details>
        ))}
      </div>
      {email && (
        <Card className="flex items-center gap-4">
          <Mail className="size-6 shrink-0 text-brand-300" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Ainda precisa de ajuda?</p>
            <p className="truncate text-sm text-fg-muted">{email}</p>
          </div>
          <a
            href={`mailto:${email}?subject=${encodeURIComponent("Ajuda — Amora Dramas")}`}
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold hover:bg-brand-500"
          >
            Escrever
          </a>
        </Card>
      )}
    </SubPage>
  );
}
