import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
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
    q: "Fui desconectado sozinho. O que aconteceu?",
    a: "Seu plano permite um número de aparelhos logados ao mesmo tempo. Quando você entra num aparelho novo, o login mais antigo é desconectado sozinho. Para usar mais aparelhos juntos, adicione telas extras. Em Perfil → Telas conectadas você vê e desconecta os aparelhos.",
  },
  {
    q: "O vídeo não carrega ou fica travando.",
    a: "Confira sua internet, feche e abra o vídeo de novo. Ele continua de onde você parou. Se continuar, fale com a gente pelo chat abaixo dizendo o nome do dorama.",
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
      <Card className="flex items-center gap-4">
        <MessageCircle className="size-6 shrink-0 text-brand-300" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Ainda precisa de ajuda?</p>
          <p className="text-sm text-fg-muted">Fale com a gente pelo chat. A resposta chega aqui no app.</p>
        </div>
        <Link href="/perfil/suporte" className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold hover:bg-brand-500">
          Abrir chat
        </Link>
      </Card>
      {email && (
        <p className="flex items-center gap-2 text-xs text-fg-subtle">
          <Mail className="size-3.5" /> Ou por e-mail: {email}
        </p>
      )}
    </SubPage>
  );
}
