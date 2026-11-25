"use client";

/**
 * Guarda os parâmetros do anúncio (utm_*, fbclid, src, sck…) de quando a
 * pessoa chegou, e cola eles nos links do checkout — assim a venda fica
 * atribuída ao anúncio certo, mesmo se ela navegou antes de comprar.
 */
const KEY = "amora:utm";
const SKIP = new Set(["planos"]);

/** Chame ao abrir a página: salva o que veio na URL (a última chegada vale). */
export function captureUtm() {
  try {
    const incoming = new URLSearchParams(window.location.search);
    const keep = new URLSearchParams();
    incoming.forEach((v, k) => {
      if (!SKIP.has(k) && v) keep.set(k, v);
    });
    if ([...keep.keys()].length) {
      sessionStorage.setItem(KEY, keep.toString());
      localStorage.setItem(KEY, keep.toString());
    }
  } catch {}
}

function saved(): URLSearchParams {
  try {
    return new URLSearchParams(
      sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY) ?? "",
    );
  } catch {
    return new URLSearchParams();
  }
}

/** Devolve o link do checkout com os parâmetros do anúncio (sem trocar os que já existem). */
export function withUtm(href: string): string {
  try {
    const url = new URL(href);
    saved().forEach((v, k) => {
      if (!url.searchParams.has(k)) url.searchParams.set(k, v);
    });
    return url.toString();
  } catch {
    return href;
  }
}
