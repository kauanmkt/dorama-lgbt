"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { marcarConversa } from "@/lib/support-actions";

export function StatusButton({ id, status }: { id: string; status: "aberto" | "resolvido" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = status === "aberto" ? "resolvido" : "aberto";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await marcarConversa(id, next);
          router.push("/admin/suporte");
        })
      }
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-bold hover:bg-white/5 disabled:opacity-50"
    >
      {status === "aberto" ? <CheckCircle2 className="size-4 text-success" /> : <RotateCcw className="size-4" />}
      {status === "aberto" ? "Marcar como resolvida" : "Reabrir"}
    </button>
  );
}
