"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Gift, Inbox, RotateCcw, X } from "lucide-react";
import { EmptyState, Modal, TextArea, TextInput, useToast } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { atualizarPedido, darCreditoPedido, type RequestStatus, type SeriesRequest } from "@/lib/request-actions";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

const BADGE: Record<RequestStatus, string> = {
  pendente: "bg-amber-500/15 text-amber-300",
  adicionada: "bg-emerald-500/15 text-emerald-300",
  recusada: "bg-white/5 text-fg-muted",
};
const LABEL: Record<RequestStatus, string> = { pendente: "Pendente", adicionada: "Adicionada", recusada: "Recusada" };

export function RequestsManager({ initial }: { initial: SeriesRequest[] }) {
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<{ req: SeriesRequest; status: RequestStatus } | null>(null);
  const [note, setNote] = useState("");
  const [gift, setGift] = useState(false);
  const [giftEmail, setGiftEmail] = useState("");
  const [pending, start] = useTransition();

  const open = (req: SeriesRequest, status: RequestStatus) => {
    setNote(req.adminNote);
    setEditing({ req, status });
  };

  const save = () => {
    if (!editing) return;
    start(async () => {
      const r = await atualizarPedido({ id: editing.req.id, status: editing.status, note });
      if (!r.ok) return toast(r.error, "error");
      toast(r.message);
      setItems((list) => list.map((x) => (x.id === editing.req.id ? { ...x, status: editing.status, adminNote: note.trim() } : x)));
      setEditing(null);
    });
  };

  const giveCredit = () => {
    start(async () => {
      const r = await darCreditoPedido({ email: giftEmail });
      if (!r.ok) return toast(r.error, "error");
      toast(r.message);
      setGift(false);
      setGiftEmail("");
    });
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setGift(true)}>
          <Gift /> Dar crédito de pedido
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line">
          <EmptyState icon={<Inbox />} title="Nenhum pedido aqui" description="Os pedidos dos clientes aparecem nesta lista." />
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-ink-900/60 p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-extrabold break-words">{r.title}</p>
                    <button
                      type="button"
                      title="Copiar nome"
                      onClick={() => {
                        navigator.clipboard?.writeText(r.title);
                        toast("Nome copiado");
                      }}
                      className="rounded-md p-1 text-fg-subtle hover:bg-white/10 hover:text-fg"
                    >
                      <Copy className="size-4" />
                    </button>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${BADGE[r.status]}`}>{LABEL[r.status]}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-fg-subtle">
                    {r.email || "cliente removido"} · {fmt(r.createdAt)}
                  </p>
                  {r.details && <p className="mt-2 text-sm whitespace-pre-wrap text-fg-muted">{r.details}</p>}
                  {r.adminNote && <p className="mt-2 text-xs text-fg-subtle">Sua resposta: {r.adminNote}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status !== "adicionada" && (
                    <Button size="sm" onClick={() => open(r, "adicionada")}>
                      <Check /> Adicionada
                    </Button>
                  )}
                  {r.status !== "recusada" && (
                    <Button size="sm" variant="ghost" onClick={() => open(r, "recusada")}>
                      <X /> Recusar
                    </Button>
                  )}
                  {r.status !== "pendente" && (
                    <Button size="sm" variant="ghost" onClick={() => open(r, "pendente")}>
                      <RotateCcw /> Pendente
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={
          editing?.status === "adicionada"
            ? "Marcar como adicionada"
            : editing?.status === "recusada"
              ? "Recusar pedido"
              : "Voltar para pendente"
        }
      >
        {editing && (
          <div className="space-y-4">
            <p className="text-sm text-fg-muted">
              <strong className="text-fg">{editing.req.title}</strong>
              {editing.status !== "pendente" && " — o cliente recebe um aviso no sino e no celular."}
            </p>
            {editing.status !== "pendente" && (
              <TextArea
                label="Mensagem para o cliente (opcional)"
                rows={3}
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={editing.status === "adicionada" ? "Ex.: Já está na categoria BL!" : "Ex.: Ainda não tem legenda em português."}
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={pending}>
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={gift} onClose={() => setGift(false)} title="Dar crédito de pedido">
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">Libera 1 pedido extra para o cliente (ex.: para compensar um problema).</p>
          <TextInput
            label="E-mail do cliente"
            type="email"
            value={giftEmail}
            onChange={(e) => setGiftEmail(e.target.value)}
            placeholder="cliente@email.com"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setGift(false)}>
              Cancelar
            </Button>
            <Button onClick={giveCredit} disabled={pending || !giftEmail.includes("@")}>
              Liberar 1 pedido
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
