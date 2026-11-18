"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { TextArea, TextInput, useToast } from "@/components/admin/ui";
import { enviarAviso } from "@/lib/notification-actions";

export function BroadcastForm() {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, start] = useTransition();

  const send = () =>
    start(async () => {
      const r = await enviarAviso({ title, body, url });
      setConfirming(false);
      if (!r.ok) return toast(r.error ?? "Não foi possível enviar", "error");
      toast(`Enviado para ${r.people} ${r.people === 1 ? "pessoa" : "pessoas"} (${r.devices} no celular)`);
      setTitle("");
      setBody("");
      setUrl("");
    });

  return (
    <div className="space-y-4">
      <TextInput label="Título" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Ex.: Maratona de BL no fim de semana 💜" />
      <TextArea label="Mensagem" value={body} onChange={(e) => setBody(e.target.value)} maxLength={240} rows={3} placeholder="Ex.: Chegaram 5 doramas novos. Vem conferir!" />
      <TextInput
        label="Abrir qual página ao tocar (opcional)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Ex.: /dorama/nome-do-dorama  (vazio = início)"
        hint="Só páginas da própria Amora."
      />

      {/* Prévia */}
      <div className="rounded-xl bg-ink-800 p-3 ring-1 ring-white/10">
        <p className="text-[11px] font-semibold text-fg-subtle uppercase">Prévia</p>
        <p className="mt-1 text-sm font-bold">{title || "Título da notificação"}</p>
        <p className="text-sm text-fg-muted">{body || "Mensagem"}</p>
      </div>

      {!confirming ? (
        <button
          type="button"
          disabled={title.trim().length < 3}
          onClick={() => setConfirming(true)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-600 text-sm font-bold transition hover:bg-brand-500 disabled:opacity-40"
        >
          <Send className="size-4" aria-hidden="true" /> Enviar para todos
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-warning/40 bg-warning/10 p-3">
          <p className="text-sm font-semibold">Mandar agora para todos os clientes com plano ativo? Não dá para desfazer.</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={sending}
              onClick={send}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-brand-600 text-sm font-bold hover:bg-brand-500 disabled:opacity-60"
            >
              {sending && <Loader2 className="size-4 animate-spin" />} Sim, enviar
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => setConfirming(false)}
              className="h-10 flex-1 rounded-full border border-line text-sm font-bold hover:bg-white/5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
