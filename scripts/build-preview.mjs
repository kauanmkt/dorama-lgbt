/**
 * Gera uma PRÉVIA ESTÁTICA do site num único arquivo HTML (preview/index.html).
 * Serve só para acompanhar o visual pelo chat — não é o site de produção.
 *
 * Uso: com o site rodando (npm run build && npx next start -p 3100):
 *   node scripts/build-preview.mjs http://localhost:3100
 */
import { mkdir, writeFile } from "node:fs/promises";

const base = process.argv[2] ?? "http://localhost:3100";

// Telas fixas na barra "Prévia"; o resto é descoberto seguindo os links do site
const tabs = [
  { path: "/", label: "Início" },
  { path: "/entrar", label: "Login" },
  { path: "/identidade", label: "Identidade" },
  { path: "/admin", label: "Painel" },
];
const MAX_PAGES = 400;

const idFor = (path) => (path === "/" ? "inicio" : path.slice(1).replace(/\//g, "--"));

const get = async (url, as = "text") => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return as === "buffer" ? Buffer.from(await r.arrayBuffer()) : r.text();
};

// 0) Descobre as páginas (segue links internos a partir das telas fixas)
const pages = {};
const queue = tabs.map((t) => t.path);
while (queue.length && Object.keys(pages).length < MAX_PAGES) {
  const path = queue.shift();
  if (pages[path]) continue;
  try {
    pages[path] = await get(base + path);
  } catch {
    continue;
  }
  for (const m of pages[path].matchAll(/href="(\/[^"#?]*)"/g)) {
    const p = m[1];
    if (!p.startsWith("/_next") && !/\.[a-z0-9]+$/i.test(p) && !pages[p] && !queue.includes(p)) queue.push(p);
  }
}
const views = Object.keys(pages).map((path) => ({ path, id: idFor(path) }));
const routeToHash = Object.fromEntries(views.map((v) => [v.path, `#${v.id}`]));
console.log(`• ${views.length} páginas encontradas`);

// 1) CSS de todas as páginas, com as fontes embutidas
const cssHrefs = new Set();
for (const html of Object.values(pages)) {
  for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)) cssHrefs.add(m[1]);
}
let css = "";
for (const href of cssHrefs) css += (await get(base + href)) + "\n";
// As fontes aparecem como "../media/x.woff2" ou "/_next/static/media/x.woff2"
for (const m of [...new Set([...css.matchAll(/url\(["']?((?:\.\.\/media|\/_next\/static\/media)\/[^)"']+\.woff2)["']?\)/g)].map((x) => x[1]))]) {
  const file = m.split("/").pop();
  const data = (await get(`${base}/_next/static/media/${file}`, "buffer")).toString("base64");
  css = css.replaceAll(m, `data:font/woff2;base64,${data}`);
}


// O React envia partes da página "depois" (Suspense): primeiro um espaço reservado
// (<!--$?--><template id="B:n">…<!--/$-->), depois o conteúdo (<div hidden id="S:n">)
// e um script que troca um pelo outro. Como a prévia não roda scripts, fazemos a troca aqui.
function closeOf(html, from, open, close) {
  let depth = 0;
  const re = new RegExp(`${open}|${close}`, "g");
  re.lastIndex = from;
  for (let m; (m = re.exec(html)); ) {
    if (new RegExp(`^(?:${open})$`).test(m[0])) depth++;
    else if (--depth === 0) return m.index + m[0].length;
  }
  return -1;
}
function resolveSuspense(html) {
  for (let guard = 0; guard < 500; guard++) {
    const seg = /<div hidden id="S:([0-9a-z]+)">/.exec(html);
    if (!seg) break;
    const segEnd = closeOf(html, seg.index, "<div[\\s>]", "</div>");
    const content = html.slice(seg.index + seg[0].length, segEnd - "</div>".length);
    html = html.slice(0, seg.index) + html.slice(segEnd);
    const marker = `<!--$?--><template id="B:${seg[1]}"></template>`;
    const at = html.indexOf(marker);
    if (at < 0) continue;
    const end = closeOf(html, at, "<!--\\$[?!]?-->", "<!--/\\$-->");
    html = html.slice(0, at) + content + html.slice(end);
  }
  return html;
}

// 2) Conteúdo de cada página (sem scripts do Next), com links trocados por #âncoras
const sections = views.map((v) => {
  let body = resolveSuspense(pages[v.path].match(/<body[^>]*>([\s\S]*)<\/body>/)[1]);
  body = body
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<link[^>]*>/g, "")
    .replace(/<template[\s\S]*?<\/template>/g, "")
    .replace(/href="(\/[^"#]*)"/g, (_, p) => `href="${routeToHash[p] ?? "#"}"`)
    // ids de SVG (gradiente da logo) únicos por tela
    .replace(/(id="|url\(#)(dl-mark-[^")]+)/g, `$1$2-${v.id}`);
  return `<div class="dl-view" data-view="${v.id}" hidden>${body}</div>`;
});
const htmlClass = pages["/"].match(/<html[^>]*class="([^"]*)"/)?.[1] ?? "";

// 3) Pequeno script: troca de telas, cabeçalho ao rolar e menu do painel no celular
const script = `
(function(){
  var ids=${JSON.stringify(views.map((v) => v.id))};
  function show(){
    var h=(location.hash||'').slice(1); if(ids.indexOf(h)<0) h='inicio';
    document.querySelectorAll('.dl-view').forEach(function(el){ el.hidden = el.dataset.view!==h; });
    document.querySelectorAll('[data-dl-tab]').forEach(function(el){ el.dataset.active = el.dataset.dlTab===h; });
    document.getElementById('dl-tabs').style.display = h.indexOf('assistir--')===0 ? 'none' : '';
    window.scrollTo(0,0); onScroll();
  }
  function onScroll(){
    document.querySelectorAll('header.fixed').forEach(function(hd){
      var s=window.scrollY>24;
      hd.classList.toggle('dl-scrolled', s);
    });
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest('a[href="#"]'); if(a) e.preventDefault();
    var open=e.target.closest('button[aria-label="Abrir menu"]');
    if(open){ var d=document.getElementById('dl-drawer'); if(d) d.hidden=false; }
    if(e.target.closest('[data-dl-close]')){ var d2=document.getElementById('dl-drawer'); if(d2) d2.hidden=true; }
  });
  window.addEventListener('hashchange',show);
  window.addEventListener('scroll',onScroll,{passive:true});
  show();
})();`;

// Gaveta do menu do painel (celular): cópia da barra lateral
const adminAside = (pages["/admin"] ?? "").match(/<aside class="sticky[\s\S]*?<\/aside>/)?.[0] ?? "";
const drawer = adminAside
  ? `<div id="dl-drawer" hidden style="position:fixed;inset:0;z-index:60">
      <div data-dl-close style="position:absolute;inset:0;background:rgba(0,0,0,.7)"></div>
      <div style="position:absolute;inset:0 auto 0 0;width:18rem;background:#0b0510">${adminAside
        .replace(/class="sticky top-0 hidden/, 'class="flex h-full')
        .replace(/(id="|url\(#)(dl-mark-[^")]+)/g, "$1$2-drawer")
        .replace(/href="(\/[^"#]*)"/g, (_, p) => `href="${routeToHash[p] ?? "#"}"`)}</div>
    </div>`
  : "";

const tabLinks = tabs
  .map((t) => `<a href="#${idFor(t.path)}" data-dl-tab="${idFor(t.path)}">${t.label}</a>`)
  .join("");

const out = `<!DOCTYPE html>
<html lang="pt-BR" class="${htmlClass}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#050208">
<title>Dorama LGBT — Prévia</title>
<style>${css}</style>
<style>
  header.fixed.dl-scrolled{background:rgb(5 2 8 / .85);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid rgb(255 255 255 / .05)}
  #dl-tabs{position:fixed;z-index:70;left:50%;transform:translateX(-50%);bottom:calc(76px + env(safe-area-inset-bottom));display:flex;gap:2px;padding:4px;border-radius:999px;background:rgb(23 11 34 / .92);border:1px solid #3a2150;backdrop-filter:blur(12px);font:600 12px/1 var(--font-sans, sans-serif);box-shadow:0 10px 30px -10px #000}
  #dl-tabs span{padding:8px 10px 8px 12px;color:#bf4dff;letter-spacing:.08em;text-transform:uppercase;font-size:10px;font-weight:800}
  #dl-tabs a{padding:8px 12px;border-radius:999px;color:#b8a8c6;text-decoration:none}
  #dl-tabs a[data-active="true"]{background:#8f00cc;color:#fff}
  @media (min-width:768px){#dl-tabs{bottom:20px}}
</style>
</head>
<body class="min-h-full">
${sections.join("\n")}
${drawer}
<nav id="dl-tabs" aria-label="Telas da prévia"><span>Prévia</span>${tabLinks}</nav>
<script>${script}</script>
</body>
</html>`;

await mkdir("preview", { recursive: true });
await writeFile("preview/index.html", out);
console.log(`✓ preview/index.html (${(out.length / 1024).toFixed(0)} KB)`);
