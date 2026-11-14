/**
 * Gera supabase/seed-demo.sql a partir do catálogo fictício (src/lib/mock/catalog.ts).
 * Uso: node --experimental-strip-types scripts/generate-seed.mjs
 */
import { writeFile } from "node:fs/promises";
import { mockCategories, mockDoramas } from "../src/lib/mock/catalog.ts";

const q = (v) => (v === undefined || v === null ? "null" : `'${String(v).replace(/'/g, "''")}'`);

const plans = [
  ["Mensal", "Acesso completo, renovado todo mês.", 1990, "recorrente", 30, 1, true, false, 1],
  ["Trimestral", "Três meses com desconto.", 4990, "recorrente", 90, 2, true, true, 2],
  ["Anual", "O melhor custo-benefício.", 15990, "recorrente", 365, 3, true, false, 3],
  ["Vitalício", "Pague uma vez, assista para sempre.", 39900, "vitalicio", null, 2, true, false, 4],
];

const featuredOrder = mockDoramas.filter((d) => d.isFeatured).map((d) => d.slug);
const lines = [];
const out = (s = "") => lines.push(s);

out("-- =====================================================================");
out("--  DADOS DE DEMONSTRAÇÃO (fictícios) — opcional");
out("--  Preenche categorias, planos e um catálogo de exemplo para testar o app.");
out("--  Para apagar depois: rode supabase/remover-demo.sql");
out("--  Gerado por scripts/generate-seed.mjs — não edite à mão.");
out("-- =====================================================================");
out("begin;");
out();
out("insert into public.categories (slug, name, description, position) values");
out(
  mockCategories
    .map((c, i) => `  (${q(c.slug)}, ${q(c.name)}, ${q(c.description)}, ${i + 1})`)
    .join(",\n") + "\non conflict (slug) do nothing;",
);
out();
out("insert into public.plans (name, description, price_cents, type, duration_days, screens, active, highlight, position)");
out("select v.name, v.description, v.price_cents, v.type::public.plan_type, v.duration_days, v.screens, v.active, v.highlight, v.position from (values");
out(
  plans
    .map(
      ([n, d, p, t, days, s, a, h, pos]) =>
        `  (${q(n)}, ${q(d)}, ${p}, '${t}', ${days ?? "null::integer"}, ${s}, ${a}, ${h}, ${pos})`,
    )
    .join(",\n"),
);
out(") as v(name, description, price_cents, type, duration_days, screens, active, highlight, position)");
out("where not exists (select 1 from public.plans p where p.name = v.name);");
out();
out(
  "insert into public.doramas (slug, title, original_title, tagline, synopsis, year, country, age_rating, status, visibility, is_featured, featured_position, is_new, popularity, art_seed) values",
);
out(
  mockDoramas
    .map(
      (d) =>
        `  (${q(d.slug)}, ${q(d.title)}, ${q(d.originalTitle)}, ${q(d.tagline)}, ${q(d.synopsis)}, ${d.year}, ${q(d.country)}, '${d.ageRating}', '${d.status}', 'publicado', ${Boolean(d.isFeatured)}, ${Math.max(0, featuredOrder.indexOf(d.slug) + 1)}, ${Boolean(d.isNew)}, ${d.popularity}, ${d.artSeed})`,
    )
    .join(",\n") + "\non conflict (slug) do nothing;",
);
out();
out("insert into public.dorama_categories (dorama_id, category_id)");
out("select d.id, c.id from (values");
out(
  mockDoramas
    .flatMap((d) => d.categories.map((c) => `  (${q(d.slug)}, ${q(c)})`))
    .join(",\n"),
);
out(") as v(dorama_slug, category_slug)");
out("join public.doramas d on d.slug = v.dorama_slug");
out("join public.categories c on c.slug = v.category_slug");
out("on conflict do nothing;");
out();
out("insert into public.seasons (dorama_id, number)");
out("select d.id, v.number from (values");
out(mockDoramas.flatMap((d) => d.seasons.map((s) => `  (${q(d.slug)}, ${s.number})`)).join(",\n"));
out(") as v(dorama_slug, number)");
out("join public.doramas d on d.slug = v.dorama_slug");
out("on conflict do nothing;");
out();
out("-- video_ready = true só para demonstração (não há arquivos reais no R2)");
out("insert into public.episodes (season_id, number, title, synopsis, duration_min, video_ready)");
out("select s.id, v.number, v.title, v.synopsis, v.duration_min, v.video_ready from (values");
out(
  mockDoramas
    .flatMap((d) =>
      d.seasons.flatMap((s) =>
        s.episodes.map((e) => {
          const ready = !(d.status === "em_exibicao" && e.number > s.episodes.length - 2);
          return `  (${q(d.slug)}, ${s.number}, ${e.number}, ${q(e.title)}, ${q(e.synopsis)}, ${e.durationMin}, ${ready})`;
        }),
      ),
    )
    .join(",\n"),
);
out(") as v(dorama_slug, season, number, title, synopsis, duration_min, video_ready)");
out("join public.doramas d on d.slug = v.dorama_slug");
out("join public.seasons s on s.dorama_id = d.id and s.number = v.season");
out("on conflict do nothing;");
out();
out("commit;");

await writeFile("supabase/seed-demo.sql", lines.join("\n") + "\n");

const remove = `-- =====================================================================
--  REMOVER DADOS DE DEMONSTRAÇÃO
--  Apaga os doramas fictícios (com temporadas e episódios) e os planos de exemplo.
--  As categorias ficam — edite ou exclua pelo painel se quiser.
-- =====================================================================
begin;
delete from public.doramas where slug in (
${mockDoramas.map((d) => `  ${q(d.slug)}`).join(",\n")}
);
delete from public.plans p
where p.name in (${plans.map((p) => q(p[0])).join(", ")})
  and not exists (select 1 from public.subscriptions s where s.plan_id = p.id);
commit;
`;
await writeFile("supabase/remover-demo.sql", remove);
console.log(`✓ supabase/seed-demo.sql (${mockDoramas.length} doramas) e supabase/remover-demo.sql`);
