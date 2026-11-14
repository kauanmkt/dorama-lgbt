"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, ExternalLink, Save, Send } from "lucide-react";
import { Artwork } from "@/components/catalog/Artwork";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  AdminHeader,
  ImageDrop,
  Panel,
  SelectInput,
  TextArea,
  TextInput,
  Toggle,
  useToast,
} from "@/components/admin/ui";
import { NOW, slugify } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminDorama, Visibility } from "@/types/admin";
import type { Category, Dorama } from "@/types/catalog";
import { SeasonsManager, type EditorSeason } from "./SeasonsManager";

const countries = ["Coreia do Sul", "Tailândia", "Japão", "Taiwan", "China", "Filipinas", "Vietnã", "Outro"];
const ratings: Dorama["ageRating"][] = ["L", "10", "12", "14", "16", "18"];

export type VideoMap = Record<string, { name: string; size: number; status: "pronto" | "processando" }>;

/**
 * EDITOR DE DORAMA — usado para "Novo dorama" e "Editar dorama".
 * Por enquanto as alterações ficam só na tela; na Etapa 6 passam a salvar no Supabase.
 */
export function DoramaEditor({
  initial,
  categories,
  videos = {},
}: {
  initial?: AdminDorama;
  categories: Category[];
  videos?: VideoMap;
}) {
  const router = useRouter();
  const toast = useToast();
  const isNew = !initial;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [originalTitle, setOriginalTitle] = useState(initial?.originalTitle ?? "");
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [synopsis, setSynopsis] = useState(initial?.synopsis ?? "");
  const [year, setYear] = useState(initial?.year ?? NOW.getFullYear());
  const [country, setCountry] = useState(initial?.country ?? countries[0]);
  const [ageRating, setAgeRating] = useState<Dorama["ageRating"]>(initial?.ageRating ?? "14");
  const [status, setStatus] = useState<Dorama["status"]>(initial?.status ?? "em_exibicao");
  const [cats, setCats] = useState<string[]>(initial?.categories ?? []);
  const [featured, setFeatured] = useState(Boolean(initial?.isFeatured));
  const [isNewRelease, setIsNewRelease] = useState(initial ? Boolean(initial.isNew) : true);
  const [visibility, setVisibility] = useState<Visibility>(initial?.visibility ?? "rascunho");
  const [seasons, setSeasons] = useState<EditorSeason[]>(
    () =>
      initial?.seasons.map((s) => ({
        number: s.number,
        episodes: s.episodes.map((e) => ({
          id: e.id,
          number: e.number,
          title: e.title,
          synopsis: e.synopsis,
          durationMin: e.durationMin,
          video: videos[e.id],
        })),
      })) ?? [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const finalSlug = slugTouched ? slug : slugify(title);
  const artSeed = initial?.artSeed ?? title.length;

  const counts = useMemo(() => {
    const eps = seasons.flatMap((s) => s.episodes);
    return { episodes: eps.length, withVideo: eps.filter((e) => e.video).length };
  }, [seasons]);

  const validate = (publishing: boolean) => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "O título é obrigatório.";
    if (!finalSlug) e.slug = "Defina o endereço da página.";
    if (publishing) {
      if (!synopsis.trim()) e.synopsis = "Escreva a sinopse antes de publicar.";
      if (cats.length === 0) e.categories = "Escolha pelo menos uma categoria.";
      if (counts.withVideo === 0) e.episodes = "Publique quando houver pelo menos um episódio com vídeo.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = (publish: boolean) => {
    if (!validate(publish)) {
      toast("Revise os campos destacados", "error");
      return;
    }
    const next: Visibility = publish ? "publicado" : visibility === "publicado" ? "publicado" : "rascunho";
    setVisibility(next);
    toast(
      publish
        ? `“${title}” publicado! Já aparece no catálogo.`
        : next === "publicado"
          ? "Alterações salvas"
          : "Rascunho salvo",
    );
    if (isNew) router.push("/admin/doramas");
  };

  return (
    <>
      <AdminHeader
        backHref="/admin/doramas"
        backLabel="Doramas"
        title={isNew ? "Novo dorama" : title || "Sem título"}
        description={
          <span className="flex items-center gap-2">
            <Badge tone={visibility === "publicado" ? "success" : "warning"}>
              {visibility === "publicado" ? "Publicado" : "Rascunho"}
            </Badge>
            {counts.episodes > 0 && (
              <span>
                {counts.episodes} episódios · {counts.withVideo} com vídeo
              </span>
            )}
          </span>
        }
        actions={
          !isNew &&
          visibility === "publicado" && (
            <ButtonLink href={`/dorama/${initial.slug}`} variant="ghost" size="sm">
              <ExternalLink /> Ver no site
            </ButtonLink>
          )
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ===== Coluna principal ===== */}
        <div className="space-y-6">
          <Panel title="Informações">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput
                label="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Amor em Seul"
                error={errors.title}
                wrapperClassName="sm:col-span-2"
              />
              <TextInput
                label="Endereço da página"
                value={finalSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                hint={<>doramalgbt.com/dorama/<strong className="text-fg-muted">{finalSlug || "..."}</strong></>}
                error={errors.slug}
              />
              <TextInput
                label="Título original (opcional)"
                value={originalTitle}
                onChange={(e) => setOriginalTitle(e.target.value)}
                placeholder="Ex.: 서울의 사랑"
              />
              <TextInput
                label="Frase de efeito"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Aparece embaixo do título no banner"
                wrapperClassName="sm:col-span-2"
                maxLength={90}
                hint={`${tagline.length}/90`}
              />
              <TextArea
                label="Sinopse"
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="Conte a história sem revelar spoilers"
                wrapperClassName="sm:col-span-2"
                rows={4}
                error={errors.synopsis}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <TextInput label="Ano" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
              <SelectInput label="País" value={country} onChange={(e) => setCountry(e.target.value)}>
                {countries.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </SelectInput>
              <SelectInput
                label="Classificação"
                value={ageRating}
                onChange={(e) => setAgeRating(e.target.value as Dorama["ageRating"])}
              >
                {ratings.map((r) => (
                  <option key={r} value={r}>
                    {r === "L" ? "Livre" : `${r} anos`}
                  </option>
                ))}
              </SelectInput>
              <SelectInput
                label="Situação"
                value={status}
                onChange={(e) => setStatus(e.target.value as Dorama["status"])}
              >
                <option value="em_exibicao">Em exibição</option>
                <option value="completo">Completo</option>
              </SelectInput>
            </div>
          </Panel>

          <Panel title="Categorias" description="Definem em quais fileiras da página inicial o dorama aparece.">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const on = cats.includes(c.slug);
                return (
                  <button
                    key={c.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setCats(on ? cats.filter((x) => x !== c.slug) : [...cats, c.slug]);
                      setErrors((e) => ({ ...e, categories: "" }));
                    }}
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors",
                      on
                        ? "bg-brand-600 text-white"
                        : "bg-white/[0.06] text-fg-muted ring-1 ring-white/10 hover:bg-white/10 hover:text-fg",
                    )}
                  >
                    {on && <Check className="size-4" />}
                    {c.name}
                  </button>
                );
              })}
            </div>
            {errors.categories && <p className="mt-2 text-xs font-semibold text-danger">{errors.categories}</p>}
          </Panel>

          <Panel title="Temporadas e episódios" description="Adicione episódios e envie os vídeos de cada um.">
            <SeasonsManager seasons={seasons} onChange={setSeasons} />
            {errors.episodes && <p className="mt-3 text-xs font-semibold text-danger">{errors.episodes}</p>}
          </Panel>
        </div>

        {/* ===== Coluna lateral ===== */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Panel title="Publicação">
            <div className="space-y-4">
              <Toggle
                checked={featured}
                onChange={setFeatured}
                label="Destaque na página inicial"
                description="Aparece no banner principal"
              />
              <Toggle
                checked={isNewRelease}
                onChange={setIsNewRelease}
                label="Marcar como lançamento"
                description="Selo “Novo” e fileira Lançamentos"
              />
            </div>
            <div className="mt-5 grid gap-2">
              <Button onClick={() => save(true)}>
                <Send /> {visibility === "publicado" ? "Salvar e manter publicado" : "Publicar"}
              </Button>
              <Button variant="outline" onClick={() => save(false)}>
                <Save /> {visibility === "publicado" ? "Salvar alterações" : "Salvar rascunho"}
              </Button>
              {visibility === "publicado" && (
                <button
                  type="button"
                  onClick={() => {
                    setVisibility("rascunho");
                    toast("Dorama retirado do catálogo");
                  }}
                  className="mt-1 text-xs font-semibold text-fg-subtle hover:text-danger"
                >
                  Despublicar (voltar para rascunho)
                </button>
              )}
            </div>
          </Panel>

          <Panel title="Imagens">
            <div className="grid grid-cols-[2fr_3fr] gap-4 lg:grid-cols-1">
              <ImageDrop
                label="Capa (vertical)"
                hint="Recomendado: 600×900"
                preview={initial && <Artwork seed={artSeed} title={title} imageUrl={initial.posterUrl} />}
              />
              <ImageDrop
                label="Banner (horizontal)"
                aspect="banner"
                hint="Recomendado: 1920×1080"
                preview={
                  initial && (
                    <Artwork seed={artSeed} title={title} imageUrl={initial.bannerUrl} variant="backdrop" />
                  )
                }
              />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
