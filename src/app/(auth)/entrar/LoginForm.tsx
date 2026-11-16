"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, ArrowRight, Loader2, MonitorSmartphone } from "lucide-react";
import { Field } from "@/components/auth/fields";
import { Button } from "@/components/ui/Button";
import { entrarComEmail, type LoginState } from "./actions";

export function LoginForm({ purchaseUrl }: { purchaseUrl?: string }) {
  const [state, dispatch, pending] = useActionState<LoginState, FormData>(entrarComEmail, {});
  const [kicked, setKicked] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- o aviso vem do endereço (?motivo=...)
  useEffect(() => setKicked(new URLSearchParams(window.location.search).get("motivo") === "outro-aparelho"), []);

  // Para onde voltar depois do login (?next=...), lido na hora do envio
  const action = (formData: FormData) => {
    formData.set("next", new URLSearchParams(window.location.search).get("next") ?? "/");
    dispatch(formData);
  };

  return (
    <form action={action} className="mt-7 space-y-4">
      {kicked && !state.error && (
        <div role="status" className="flex gap-2.5 rounded-xl bg-brand-500/10 px-4 py-3 text-sm ring-1 ring-brand-400/30">
          <MonitorSmartphone className="mt-0.5 size-4 shrink-0 text-brand-300" />
          <div>
            <p className="font-semibold">Sua conta entrou em outro aparelho.</p>
            <p className="mt-1 text-fg-muted">
              Seu plano permite um número limitado de aparelhos conectados, então este foi desconectado. Para
              usar mais aparelhos ao mesmo tempo, adicione telas extras.
            </p>
          </div>
        </div>
      )}
      <Field
        label="E-mail da compra"
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        placeholder="voce@email.com"
        defaultValue={state.email}
        required
        autoFocus
      />

      {state.error && (
        <div role="alert" className="flex gap-2.5 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger ring-1 ring-danger/25">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">{state.error}</p>
            <p className="mt-1 text-fg-muted">
              Use o mesmo e-mail informado na compra.
              {purchaseUrl && (
                <>
                  {" "}
                  Ainda não é assinante?{" "}
                  <a href={purchaseUrl} className="font-bold text-brand-300 underline-offset-2 hover:underline">
                    Assine agora
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
