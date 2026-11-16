"use client";

import { useState, useTransition } from "react";
import { Loader2, MonitorSmartphone } from "lucide-react";
import { desconectarTela } from "@/lib/account-actions";
import { describeDevice } from "@/lib/device-id";

export type ScreenRow = { id: string; userAgent: string | null; since: string; lastSeen: string };

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export function ScreensList({ rows, current }: { rows: ScreenRow[]; current: string | null }) {
  const [list, setList] = useState(rows);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-fg-muted">
        Nenhum aparelho conectado.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-line bg-ink-900/60">
      {list.map((r) => {
        const isMine = r.id === current;
        return (
          <li key={r.id} className="flex items-center gap-4 px-5 py-4">
            <MonitorSmartphone className="size-6 shrink-0 text-brand-300" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {describeDevice(r.userAgent)}
                {isMine && <span className="ml-2 text-xs font-bold text-success">este aparelho</span>}
              </p>
              <p className="truncate text-xs text-fg-muted">Conectado desde {fmt.format(new Date(r.since))}</p>
            </div>
            {!isMine && (
              <button
                type="button"
                disabled={pending && busyId === r.id}
                onClick={() => {
                  setBusyId(r.id);
                  start(async () => {
                    const res = await desconectarTela(r.id);
                    if (res.ok) setList((l) => l.filter((x) => x.id !== r.id));
                  });
                }}
                className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-bold text-danger transition hover:bg-danger/10 disabled:opacity-50"
              >
                {pending && busyId === r.id && <Loader2 className="size-4 animate-spin" />} Desconectar
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
