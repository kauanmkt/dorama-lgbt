"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { atualizarNome } from "@/lib/account-actions";

export function NameForm({ initial }: { initial: string }) {
  const [name, setName] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await atualizarNome(name);
          setMsg(r.ok ? { ok: true, text: "Nome salvo" } : { ok: false, text: r.error ?? "Erro ao salvar" });
        });
      }}
    >
      <label htmlFor="nome" className="text-sm font-semibold text-fg-muted">
        Como podemos te chamar?
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="nome"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setMsg(null);
          }}
          maxLength={60}
          autoComplete="name"
          className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-ink-950 px-4 text-[15px] outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={pending || name.trim() === initial.trim()}
          className="flex h-12 items-center gap-1.5 rounded-xl bg-brand-600 px-5 text-sm font-bold transition hover:bg-brand-500 disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Salvar
        </button>
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
    </form>
  );
}
