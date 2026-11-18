import "server-only";

/**
 * ROTINA AUTOMÁTICA DE NOTIFICAÇÕES (roda a cada 15 min pelo agendador).
 *
 *  - Lançamentos: dorama publicado → avisa quem tem acesso (das 9h às 22h).
 *  - Continuar assistindo: parou no meio há 1–3 dias → lembrete (das 18h às 22h).
 *  - Saudade: 5+ dias sem entrar → convite para voltar (das 18h às 22h, 1x por semana).
 * Lembretes só vão para quem ativou no celular, no máximo 1 por dia.
 */
import { notify, recipients } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

function hourInBrazil(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(now));
}

type Release = {
  id: string;
  slug: string;
  title: string;
  poster_url: string | null;
  published_at: string | null;
  dorama_categories: { categories: { slug: string } | null }[];
};

function tagOf(d: Release) {
  const cats = d.dorama_categories.map((c) => c.categories?.slug);
  if (cats.includes("gl")) return "GL";
  if (cats.includes("bl")) return "BL";
  return null;
}

async function releases() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("doramas")
    .select("id, slug, title, poster_url, published_at, dorama_categories(categories(slug))")
    .eq("visibility", "publicado")
    .is("release_notified_at", null)
    .order("published_at", { ascending: true })
    .limit(50);
  if (error) throw new Error(error.message);
  const all = (data ?? []) as unknown as Release[];
  if (!all.length) return { doramas: 0, people: 0, devices: 0 };

  const cutoff = Date.now() - 3 * 24 * 3600_000;
  const fresh = all.filter((d) => d.published_at && Date.parse(d.published_at) > cutoff);
  const markDone = () =>
    admin
      .from("doramas")
      .update({ release_notified_at: new Date().toISOString() })
      .in("id", all.map((d) => d.id));

  if (!fresh.length) {
    await markDone(); // republicação de dorama antigo: não vira "lançamento"
    return { doramas: 0, people: 0, devices: 0 };
  }

  const to = await recipients("lancamento");
  let result;
  if (fresh.length === 1) {
    const d = fresh[0];
    const tag = tagOf(d);
    result = await notify(to, {
      kind: "lancamento",
      ref: d.id,
      title: tag ? `Novo ${tag} na Amora 💜` : "Dorama novo na Amora 💜",
      body: `${d.title} acabou de chegar. Dá o play!`,
      url: `/dorama/${d.slug}`,
      image: d.poster_url,
    });
  } else {
    const names = fresh.slice(0, 2).map((d) => d.title);
    const rest = fresh.length - names.length;
    result = await notify(to, {
      kind: "lancamento",
      ref: `lote:${fresh.map((d) => d.id).sort().join(",").slice(0, 200)}`,
      title: `${fresh.length} doramas novos chegaram 💜`,
      body: rest > 0 ? `${names.join(", ")} e mais ${rest}. Vem conferir!` : `${names.join(" e ")}. Vem conferir!`,
      url: "/",
      image: fresh[0].poster_url,
    });
  }
  await markDone();
  return { doramas: fresh.length, ...result };
}

async function continueWatching() {
  const { data, error } = await createAdminClient().rpc("notify_continue_candidates");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { user_id: string; episode_id: string; title: string; poster_url: string | null; pct: number; ref: string }[];
  let devices = 0;
  for (const r of rows) {
    const res = await notify([r.user_id], {
      kind: "continuar",
      ref: r.ref,
      title: "Continue de onde parou ▶",
      body: `Você parou em ${r.pct}% de ${r.title}. Bora terminar?`,
      url: `/assistir/${r.episode_id}`,
      image: r.poster_url,
    });
    devices += res.devices;
  }
  return { people: rows.length, devices };
}

async function comeback() {
  const { data, error } = await createAdminClient().rpc("notify_comeback_candidates");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { user_id: string; name: string; days: number; new_count: number }[];
  const week = new Date().toISOString().slice(0, 10);
  let devices = 0;
  for (const r of rows) {
    const first = r.name?.trim().split(/\s+/)[0];
    const res = await notify([r.user_id], {
      kind: "saudade",
      ref: `saudade:${week}`,
      title: first ? `${first}, sentimos sua falta 💜` : "Sentimos sua falta 💜",
      body:
        r.new_count > 0
          ? `Chegaram ${r.new_count} ${r.new_count === 1 ? "dorama novo" : "doramas novos"} desde sua última visita.`
          : "Tem dorama esperando por você. Bora maratonar?",
      url: "/",
    });
    devices += res.devices;
  }
  return { people: rows.length, devices };
}

export async function runNotificationJobs(now = new Date()) {
  const hour = hourInBrazil(now);
  const out: Record<string, unknown> = { hora: hour };
  if (hour >= 9 && hour < 22) out.lancamentos = await releases();
  if (hour >= 18 && hour < 22) {
    out.continuar = await continueWatching();
    out.saudade = await comeback();
  }
  return out;
}
