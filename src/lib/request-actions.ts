"use server";

/**
 * "SOLICITAR SÉRIE" (order bump).
 * Cada compra do produto dá 1 crédito; cada pedido gasta 1 crédito.
 * O banco confere tudo (créditos, quem é quem) — a tela só mostra.
 */
import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type RequestStatus = "pendente" | "adicionada" | "recusada";

export type SeriesRequest = {
  id: string;
  title: string;
  details: string;
  status: RequestStatus;
  adminNote: string;
  createdAt: string;
  email?: string;
  name?: string;
};

type Row = {
  id: string;
  title: string;
  details: string;
  status: RequestStatus;
  admin_note: string;
  created_at: string;
  email?: string;
  profiles?: { name: string | null } | null;
};

const mapRow = (r: Row): SeriesRequest => ({
  id: r.id,
  title: r.title,
  details: r.details,
  status: r.status,
  adminNote: r.admin_note,
  createdAt: r.created_at,
  email: r.email,
  name: r.profiles?.name ?? undefined,
});

async function db() {
  const { createSessionClient } = await import("@/lib/supabase/server");
  return createSessionClient();
}

// ---------------- Cliente ----------------

/** Créditos disponíveis (-1 = ilimitado, para o admin) e os pedidos já feitos. */
export async function meusPedidos(): Promise<{ credits: number; requests: SeriesRequest[] }> {
  if (!isSupabaseConfigured) return { credits: 1, requests: [] };
  await requireUser("/solicitar");
  const supabase = await db();
  const { data: user } = await supabase.auth.getClaims();
  const [credits, list] = await Promise.all([
    supabase.rpc("my_request_credits"),
    supabase
      .from("series_requests")
      .select("id, title, details, status, admin_note, created_at")
      .eq("user_id", String(user?.claims?.sub ?? ""))
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  return {
    credits: typeof credits.data === "number" ? credits.data : 0,
    requests: ((list.data ?? []) as Row[]).map(mapRow),
  };
}

export async function enviarPedido(input: { title: string; details?: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: true };
  await requireUser("/solicitar");
  const title = input.title.trim();
  if (title.length < 2) return { ok: false, error: "Digite o nome da série." };
  const supabase = await db();
  const { error } = await supabase.rpc("submit_series_request", {
    p_title: title.slice(0, 200),
    p_details: (input.details ?? "").trim().slice(0, 1000),
  });
  if (error) {
    if (error.message.includes("sem_credito")) {
      return { ok: false, error: "Você não tem crédito para pedir. Libere um novo pedido para continuar." };
    }
    if (error.message.includes("titulo_curto")) return { ok: false, error: "Digite o nome da série." };
    return { ok: false, error: "Não foi possível enviar agora. Tente de novo em instantes." };
  }
  revalidatePath("/solicitar");
  return { ok: true };
}

// ---------------- Admin ----------------

export async function listarPedidos(status: RequestStatus | "todos"): Promise<SeriesRequest[]> {
  if (!isSupabaseConfigured) return [];
  await requireAdmin();
  const supabase = await db();
  let q = supabase
    .from("series_requests")
    .select("id, title, details, status, admin_note, created_at, email")
    .order("created_at", { ascending: false })
    .limit(300);
  if (status !== "todos") q = q.eq("status", status);
  const { data } = await q;
  return ((data ?? []) as Row[]).map(mapRow);
}

/** Muda o status do pedido e avisa o cliente (sino + celular). */
export async function atualizarPedido(input: {
  id: string;
  status: RequestStatus;
  note?: string;
}): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: true, message: "Modo demonstração" };
  await requireAdmin();
  const supabase = await db();
  const note = (input.note ?? "").trim().slice(0, 1000);
  const { data, error } = await supabase
    .from("series_requests")
    .update({ status: input.status, admin_note: note, updated_at: new Date().toISOString() })
    .eq("id", input.id)
    .select("user_id, title")
    .maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "Pedido não encontrado." };

  let notified = false;
  if (data.user_id && input.status !== "pendente") {
    try {
      const { notify } = await import("@/lib/push");
      const added = input.status === "adicionada";
      const r = await notify([data.user_id], {
        kind: "pedido",
        ref: `${input.id}:${input.status}`,
        title: added ? "Sua série chegou! 🎉" : "Sobre o seu pedido de série",
        body: added
          ? `“${data.title}” já está na Amora.${note ? ` ${note}` : ""}`
          : `Não conseguimos adicionar “${data.title}”.${note ? ` ${note}` : ""}`,
        url: added ? "/buscar" : "/solicitar",
      });
      notified = r.people > 0;
    } catch (e) {
      console.error("[pedido] aviso ao cliente:", e);
    }
  }
  revalidatePath("/admin/pedidos");
  const label = input.status === "adicionada" ? "Marcado como adicionada" : input.status === "recusada" ? "Pedido recusado" : "Voltou para pendente";
  return { ok: true, message: notified ? `${label} — cliente avisado` : label };
}

/** Dá crédito(s) manualmente a um cliente (ex.: compensar um problema). */
export async function darCreditoPedido(input: { email: string; amount?: number }): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: true, message: "Modo demonstração" };
  await requireAdmin();
  const supabase = await db();
  const email = input.email.trim().toLowerCase();
  const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!profile) return { ok: false, error: "Nenhum cliente com esse e-mail." };
  const amount = Math.max(1, Math.min(10, Math.round(input.amount ?? 1)));
  const { error } = await supabase
    .from("series_request_credits")
    .insert(Array.from({ length: amount }, () => ({ user_id: profile.id, source: "admin" })));
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: `${amount} ${amount === 1 ? "crédito liberado" : "créditos liberados"} para ${email}` };
}
