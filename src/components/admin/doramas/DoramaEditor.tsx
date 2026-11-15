"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Check, ExternalLink, Info, Loader2, Save, Send } from "lucide-react";
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
import { alterarVisibilidade, salvarDorama } from "@/lib/content-actions";
import { uploadImage, type ImageKind } from "@/components/admin/image-upload";
import { cn } from "@/lib/utils";
import type { AdminDorama, Visibility } from "@/types/admin";
import type { Category, Dorama } from "@/types/catalog";
import { SeasonsManager, type EditorSeason } from "./SeasonsManager";

const countries = ["Coreia do Sul", "Tailândia", "Japão", "Taiwan", "China", "Filipinas", "Vietnã", "Outro"];
const ratings: Dorama["ageRating"][] = ["L", "10", "12", "14", "16", "18"];

export type VideoMap = Record<string, { name: string; size: number; status: "pronto" | "processando" }>;

/**
 * EDITOR DE DORAMA — usado para "Novo dorama" e "Editar dorama".
 * Tudo o que está na tela (dados, categorias, temporadas e episódios) é salvo
 * de uma vez no banco ao clicar em Salvar/Publicar.
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
  const [posterUrl, setPosterUrl] = useState(initial?.posterUrl);
  const [bannerUrl, setBannerUrl] = useState(initial?.bannerUrl);
  const [uploading, setUploading] = useState<Record<ImageKind, boolean>>({ poster: false, banner: false });
  const [saving, startSaving] = useTransition();
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
          ready: e.available,
        })),
      })) ?? [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const finalSlug = slugTouched ? slug : slugify(title);
  const artSeed = initial?.artSeed ?? title.length;

  const counts = useMemo(() => {
    const eps = seasons.flatMap((s) => s.episodes);
    return { episodes: eps.length, withVideo: eps.filter((e) => e.video || e.ready).length };
  }, [seasons]);

  const validate = (publishing: boolean) => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "O título é obrigatório.";
    if (!finalSlug) e.slug = "Defina o endereço da página.";
    if (publishing) {
      if (!synopsis.trim()) e.synopsis = "Escreva a sinopse antes de publicar.";
      if (cats.length === 0) e.categories = "Escolha pelo menos uma categoria.";
    }
    const numbers = seasons.map((s) => s.episodes.map((ep) => ep.number));
    if (numbers.some((list) => new Set(list).size !== list.length)) {
      e.episodes = "Há episódios com o mesmo número na mesma temporada.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const busy = saving || uploading.poster || uploading.banner;

  const pickImage = async (kind: ImageKind, file: File) => {
    setUploading((u) => ({ ...u, [kind]: true }));
    try {
      const url = await uploadImage(file, `doramas/${initial?.id ?? (finalSlug || "novo")}`, kind);
      if (kind === "poster") setPosterUrl(url);
      else setBannerUrl(url);
      toast(kind === "poster" ? "Capa enviada — clique em Salvar para aplicar" : "Banner enviado — clique em Salvar para aplicar");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao enviar a imagem", "error");
    } finally {
      setUploading((u) => ({ ...u, [kind]: false }));
    }
  };

  const save = (publish: boolean) => {
    if (!validate(publish)) {
      toast("Revise os campos destacados", "error");
      return;
    }
    const next: Visibility = publish ? "publicado" : visibility;
    startSaving(async () => {
      const r = await salvarDorama({
        id: initial?.id,
        slug: finalSlug,
        title,
        originalTitle,
        tagline,
        synopsis,
        year,
        country,
        ageRating,
        status,
        visibility: next,
        isFeatured: featured,
        isNew: isNewRelease,
        artSeed,
        // Endereços locais (blob:) só existem no modo demonstração
        posterUrl: posterUrl?.startsWith("blob:") ? undefined : posterUrl,
        bannerUrl: bannerUrl?.startsWith("blob:") ? undefined : bannerUrl,
        categories: cats,
        seasons: seasons.map((s) => ({
          number: s.number,
          episodes: s.episodes.map(({ id, number, title, synopsis, durationMin }) => ({
            id,
            number,
            title,
            synopsis,
            durationMin,
          })),
        })),
      });
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      setVisibility(next);
      toast(
        r.message ??
          (publish && visibility !== "publicado"
            ? `“${title}” publicado! Já aparece no catálogo.`
            : next === "publicado"
              ? "Alterações salvas — o site já foi atualizado"
              : "Rascunho salvo"),
      );
      const slugNow = r.slug ?? finalSlug;
      if (isNew || slugNow !== initial?.slug) router.replace(`/admin/doramas/${slugNow}`);
      else router.refresh();
    });
  };

  const unpublish = () => {
    if (!initial) return setVisibility("rascunho");
    startSaving(async () => {
      const r = await alterarVisibilidade(initial.id, "rascunho");
      if (!r.ok) return toast(r.error, "error");
      setVisibility("rascunho");
      toast("Dorama retirado do catálogo");
      router.refresh();
    });
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
            <SeasonsManager
              seasons={seasons}
              onChange={(next) => {
                setSeasons(next);
                setErrors((e) => ({ ...e, episodes: "" }));
              }}
            />
            {seasons.some((s) => s.episodes.length > 0) && (
              <p className="mt-3 flex items-start gap-2 text-xs text-fg-subtle">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                Episódios sem vídeo aparecem no site como “Em breve”. Lembre de clicar em Salvar depois de
                mexer nos episódios.
              </p>
            )}
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
              {visibility === "publicado" ? (
                <Button onClick={() => save(false)} disabled={busy}>
                  {saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar alterações
                </Button>
              ) : (
                <>
                  <Button onClick={() => save(true)} disabled={busy}>
                    {saving ? <Loader2 className="animate-spin" /> : <Send />} Publicar
                  </Button>
                  <Button variant="outline" onClick={() => save(false)} disabled={busy}>
                    <Save /> Salvar rascunho
                  </Button>
                </>
              )}
              {visibility === "publicado" && (
                <button
                  type="button"
                  onClick={unpublish}
                  disabled={busy}
                  className="mt-1 text-xs font-semibold text-fg-subtle hover:text-danger disabled:opacity-50"
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
                hint="Recomendado: 800×1200"
                onFile={(f) => pickImage("poster", f)}
                busy={uploading.poster}
                preview={(initial || posterUrl) && <Artwork seed={artSeed} title={title} imageUrl={posterUrl} />}
              />
              <ImageDrop
                label="Banner (horizontal)"
                aspect="banner"
                hint="Recomendado: 1920×1080"
                onFile={(f) => pickImage("banner", f)}
                busy={uploading.banner}
                preview={
                  (initial || bannerUrl) && (
                    <Artwork seed={artSeed} title={title} imageUrl={bannerUrl} variant="backdrop" />
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
