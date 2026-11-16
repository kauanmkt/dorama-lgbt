/**
 * Regras da integração com a Lowify (usadas pelo webhook).
 * Ficam separadas para poderem ser testadas sem servidor.
 */

export type LowifyPayload = {
  event?: string;
  order_id?: string | number;
  sale_amount?: number | string;
  status?: string;
  product?: { id?: string | number; name?: string; price?: number | string; type?: string };
  customer?: { name?: string; email?: string; phone?: string };
};

/**
 * O que esse aviso significa para o acesso do cliente:
 *  - "pago": libera (ou renova) o acesso;
 *  - "reembolso": dinheiro devolvido (reembolso/chargeback) → corta o acesso na hora;
 *  - "cancelado": assinatura cancelada/expirada → NÃO corta; o acesso vale até a
 *    data já paga e simplesmente não é renovado;
 *  - "ignorar": avisos sem efeito (pix gerado, boleto impresso, carrinho…).
 */
export function classify(p: LowifyPayload): "pago" | "reembolso" | "cancelado" | "ignorar" {
  const text = `${p.event ?? ""} ${p.status ?? ""}`.toLowerCase();
  if (/refund|chargeback|charge_back|reembols|estorn|disput/.test(text)) return "reembolso";
  if (/cancel|expired|expirad|revoked/.test(text)) return "cancelado";
  if (/(^|[\s._])(paid|approved|aprovad[oa]|completed|renewed|pago)($|[\s._])/.test(text)) return "pago";
  return "ignorar";
}

export type PlanCandidate = {
  id: string;
  name: string;
  price_cents: number;
  active: boolean;
  external_product_ids: string[];
};

/**
 * Qual plano essa venda libera:
 *  1) o plano ligado ao ID do produto (painel → Planos);
 *  2) se nenhum estiver ligado: o único plano ativo com o mesmo preço;
 *  3) se só existir um plano ativo: ele.
 */
export function pickPlan(plans: PlanCandidate[], p: LowifyPayload, amountCents: number) {
  const productId = p.product?.id != null ? String(p.product.id).trim() : "";
  const byId = productId ? plans.find((pl) => pl.external_product_ids.includes(productId)) : undefined;
  if (byId) return byId;

  // Produtos extras (order bump/upsell) só contam se estiverem ligados a um plano
  if (p.product?.type && p.product.type !== "principal") return null;

  const active = plans.filter((pl) => pl.active);
  const productCents = Math.round(Number(p.product?.price ?? 0) * 100);
  const byPrice = active.filter((pl) => pl.price_cents === productCents || pl.price_cents === amountCents);
  if (byPrice.length === 1) return byPrice[0];
  if (active.length === 1) return active[0];
  return null;
}
