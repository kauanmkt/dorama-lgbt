import { cacheLife, cacheTag } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const PLANS_TAG = "planos-site";

/** Plano como aparece na janela "Escolha seu plano" (visitante). */
export type SitePlan = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  durationDays: number | null;
  highlight: boolean;
  checkoutUrl: string;
};

const DEMO: SitePlan[] = [
  { id: "m", name: "Mensal", description: "Acesso a todo o catálogo por 30 dias", priceCents: 1990, durationDays: 30, highlight: false, checkoutUrl: "#" },
  { id: "t", name: "Trimestral", description: "Acesso a todo o catálogo por 3 meses", priceCents: 4990, durationDays: 90, highlight: true, checkoutUrl: "#" },
  { id: "a", name: "Anual", description: "Acesso a todo o catálogo por 1 ano", priceCents: 14990, durationDays: 365, highlight: false, checkoutUrl: "#" },
];

/** Planos ativos, marcados "mostrar no site" e com link de checkout. */
export async function getSitePlans(): Promise<SitePlan[]> {
  "use cache";
  cacheTag(PLANS_TAG);
  cacheLife({ stale: 300, revalidate: 3600, expire: 86_400 });
  if (!isSupabaseConfigured) return DEMO;
  const { createPublicClient } = await import("@/lib/supabase/public");
  const { data, error } = await createPublicClient()
    .from("plans")
    .select("id, name, description, price_cents, duration_days, highlight, checkout_url")
    .eq("active", true)
    .eq("show_on_site", true)
    .neq("checkout_url", "")
    .order("position")
    .order("created_at");
  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    priceCents: p.price_cents ?? 0,
    durationDays: p.duration_days,
    highlight: Boolean(p.highlight),
    checkoutUrl: p.checkout_url,
  }));
}
