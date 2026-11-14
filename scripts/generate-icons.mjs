/**
 * Gera os ícones do app (PWA, iPhone e favicon) a partir de um SVG.
 * Uso: npm run icons
 * Quando a logo oficial chegar, basta trocar os SVGs abaixo e rodar de novo.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const mark = (pad = 0, rounded = true) => {
  const s = 512;
  const inner = s - pad * 2;
  const k = inner / 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a61ff0"/><stop offset="0.55" stop-color="#8f00cc"/><stop offset="1" stop-color="#e040fb"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${rounded ? 128 : 0}" fill="url(#g)"/>
  <g transform="translate(${pad} ${pad}) scale(${k})">
    <path d="M18 14h14c11 0 18 7.6 18 18s-7 18-18 18H18z" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>
    <path d="M28 24.5v15l11.5-7.5z" fill="#fff"/>
  </g>
</svg>`;
};

const out = async (svg, size, file) => {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
  console.log("✓", file);
};

await mkdir("public/icons", { recursive: true });

// Ícone padrão (cantos arredondados)
await out(mark(0), 192, "public/icons/icon-192.png");
await out(mark(0), 512, "public/icons/icon-512.png");
// "Maskable": Android recorta em círculo/quadrado, então damos margem de segurança
await out(mark(96, false), 512, "public/icons/maskable-512.png");
// iPhone (o iOS arredonda sozinho)
await out(mark(56, false), 180, "src/app/apple-icon.png");
// Aba do navegador
await out(mark(0), 64, "src/app/icon.png");
await writeFile("src/app/icon.svg", mark(0));
console.log("✓ src/app/icon.svg");
