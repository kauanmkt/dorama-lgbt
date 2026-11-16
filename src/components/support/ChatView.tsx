"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import type { ChatMessage } from "@/lib/support-actions";
import { cn } from "@/lib/utils";

/**
 * Conversa no estilo WhatsApp: minhas mensagens à direita, as da outra
 * pessoa à esquerda. Busca novas mensagens a cada 5 s.
 */
export function ChatView({
  initial,
  me,
  load,
  send,
  emptyText,
  placeholder = "Escreva sua mensagem…",
  className,
}: {
  initial: ChatMessage[];
  me: ChatMessage["sender"];
  load: () => Promise<ChatMessage[]>;
  send: (body: string) => Promise<{ ok: boolean; error?: string }>;
  emptyText: string;
  placeholder?: string;
  className?: string;
}) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, startSend] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const fresh = await load().catch(() => null);
      if (fresh) setMessages(fresh);
    }, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const submit = () => {
    const body = text.trim();
    if (!body || sending) return;
    setError("");
    startSend(async () => {
      const r = await send(body);
      if (!r.ok) {
        setError(r.error ?? "Não foi possível enviar.");
        return;
      }
      setText("");
      setMessages(await load());
    });
  };

  const dayOf = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-ink-950", className)}>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto bg-[radial-gradient(circle_at_20%_0%,rgba(143,0,204,0.12),transparent_60%)] px-3 py-4 sm:px-5">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-fg-muted">{emptyText}</p>}
        {messages.map((m, i) => {
          const d = new Date(m.createdAt);
          const day = dayOf(m.createdAt);
          const showDay = i === 0 || dayOf(messages[i - 1].createdAt) !== day;
          const mine = m.sender === me;
          return (
            <div key={m.id}>
              {showDay && (
                <p className="my-3 text-center">
                  <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-fg-muted">{day}</span>
                </p>
              )}
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap shadow-sm",
                    mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-ink-800 text-fg",
                  )}
                >
                  {m.body}
                  <span className={cn("mt-0.5 block text-right text-[10px]", mine ? "text-white/70" : "text-fg-subtle")}>
                    {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {error && <p className="px-4 pt-2 text-sm text-danger">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2 border-t border-line bg-ink-900 p-2.5"
      >
        <label htmlFor="chat-msg" className="sr-only">
          Mensagem
        </label>
        <textarea
          id="chat-msg"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder={placeholder}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-ink-950 px-4 py-2.5 text-[15px] outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Enviar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 transition hover:bg-brand-500 disabled:opacity-40"
        >
          {sending ? <Loader2 className="size-5 animate-spin" /> : <SendHorizontal className="size-5" />}
        </button>
      </form>
    </div>
  );
}
