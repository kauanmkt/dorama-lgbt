/** Só aceita destinos internos do próprio site (evita redirecionar para sites falsos). */
export function safeNext(value: unknown, fallback = "/") {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}
