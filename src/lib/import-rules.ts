/**
 * Regras da importação do catálogo antigo: limpar o título e descobrir as
 * categorias pelas marcas que vinham no nome ("(Dublado)", "Bl", "(gl)"…).
 */

const TAG = /[\s([|_-]*\b(dublado(?:\s*pt\/?br)?|legendado|bl|gl|lg|lgbt\+?)\b[\s)\]|]*$/i;

export function cleanTitle(raw: string): string {
  let t = raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  t = t.replace(/^[|\s-]+/, "");
  // Tira marcas do fim, repetidamente: "Fulano Bl (Dublado)" → "Fulano"
  for (let i = 0; i < 4; i++) {
    const next = t.replace(TAG, "").trim();
    if (next === t) break;
    t = next;
  }
  t = t.replace(/[\s,:;|_-]+$/, "").trim();
  // TÍTULOS EM CAIXA ALTA → Título em Caixa Normal
  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length > 3 && letters === letters.toUpperCase()) {
    const small = new Set(["a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas", "com", "por", "para", "um", "uma", "ao"]);
    t = t
      .toLowerCase()
      .split(" ")
      .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(" ");
  }
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t || raw.trim();
}

export function detectCategories(raw: string): string[] {
  const t = raw.toLowerCase();
  const cats: string[] = [];
  if (/\bbl\b|\(bl\)|boys'? ?love/.test(t)) cats.push("bl");
  if (/\bgl\b|\(gl\)|\blg\b|girls'? ?love|lésbic/.test(t)) cats.push("gl");
  if (/dublad/.test(t)) cats.push("dublados");
  return cats;
}
