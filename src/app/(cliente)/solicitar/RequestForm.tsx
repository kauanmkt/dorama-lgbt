"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, ExternalLink, Loader2, Lock, Plus, Send } from "lucide-react";
import { enviarPedido } from "@/lib/request-actions";

/** Formulário do pedido (quem tem crédito). */
export function RequestForm({ credits }: { credits: number }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-300" aria-hidden="true" />
        <h2 className="mt-3 text-xl font-extrabold">Pedido enviado!</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-fg-muted">
          Nossa equipe vai procurar a série. Quando ela entrar na Amora, você recebe um aviso.
        </p>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await enviarPedido({ title, details });
      if (!r.ok) return setError(r.error);
      setSent(true);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-brand-500/40 bg-gradient-to-br from-brand-900/50 to-ink-900 p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-brand-600">
          <Plus className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-extrabold">Qual série você quer ver?</h2>
          <p className="text-xs text-fg-muted">
            {credits < 0 ? "Admin: pedidos ilimitados" : credits === 1 ? "Você tem 1 pedido disponível" : `Você tem ${credits} pedidos disponíveis`}
          </p>
        </div>
      </div>

      <label className="mt-5 block text-sm font-semibold" htmlFor="req-title">
        Nome da série
      </label>
      <input
        id="req-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        required
        placeholder="Ex.: Love in the Air"
        className="mt-1.5 h-12 w-full rounded-xl border border-white/10 bg-ink-950/70 px-4 outline-none focus:border-brand-400"
      />

      <label className="mt-4 block text-sm font-semibold" htmlFor="req-details">
        Mensagem <span className="font-normal text-fg-subtle">(opcional)</span>
      </label>
      <textarea
        id="req-details"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Ano, país, temporada, onde você viu… tudo ajuda a encontrar."
        className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-ink-950/70 px-4 py-3 outline-none focus:border-brand-400"
      />

      {error && <p className="mt-3 text-sm font-semibold text-red-300">{error}</p>}

      <button
        type="submit"
        disabled={pending || title.trim().length < 2}
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 font-bold transition hover:bg-brand-500 disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-4" />} Enviar pedido
      </button>
      {credits > 0 && <p className="mt-3 text-center text-xs text-fg-subtle">Cada pedido usa 1 crédito.</p>}
    </form>
  );
}

/** Quem ainda não comprou (ou já usou o crédito): botão para o checkout. */
export function RequestLocked({ url, email, again }: { url: string; email: string | null; again: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-500/40 bg-gradient-to-br from-brand-900/60 to-ink-900 p-6 text-center">
      <span className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-600">
        <Plus className="size-9" aria-hidden="true" />
        <span className="absolute -right-1.5 -bottom-1.5 flex size-7 items-center justify-center rounded-full bg-ink-900 ring-2 ring-brand-500">
          <Lock className="size-3.5" aria-hidden="true" />
        </span>
      </span>
      <h2 className="mt-4 text-xl font-extrabold">{again ? "Quer pedir outra série?" : "Peça a série que você quiser"}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-fg-muted">
        {again
          ? "Você já usou o seu pedido. Libere um novo para pedir mais uma série."
          : "Libere o seu pedido e diga qual série quer ver. Nossa equipe procura e adiciona na Amora."}
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 font-bold transition hover:bg-brand-500"
      >
        Liberar meu pedido <ExternalLink className="size-4" aria-hidden="true" />
      </a>
      <p className="mt-3 text-xs text-fg-muted">Cada compra libera 1 pedido.</p>
      {email && (
        <p className="mt-1 text-xs text-fg-muted">
          No pagamento, use o mesmo e-mail da sua conta: <strong className="break-all text-fg">{email}</strong>
        </p>
      )}
    </div>
  );
}
