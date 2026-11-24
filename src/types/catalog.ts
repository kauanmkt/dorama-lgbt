/**
 * Formato dos dados do catálogo.
 * Na Etapa 4 estes mesmos tipos passam a vir do banco (Supabase),
 * então as telas não precisam mudar.
 */

export type Category = {
  slug: string;
  name: string;
  description?: string;
};

export type Episode = {
  id: string;
  doramaSlug: string;
  season: number;
  number: number;
  title: string;
  synopsis: string;
  durationMin: number;
  thumbnailUrl?: string;
  /** Há vídeo pronto para assistir? (falso = aparece como "Em breve") */
  available: boolean;
};

export type Season = {
  number: number;
  title?: string;
  episodes: Episode[];
};

export type DoramaStatus = "em_exibicao" | "completo";

export type Dorama = {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  tagline: string;
  synopsis: string;
  year: number;
  country: string;
  ageRating: "L" | "10" | "12" | "14" | "16" | "18";
  categories: string[];
  status: DoramaStatus;
  isNew?: boolean;
  /** Quando foi publicado no catálogo (ISO). */
  publishedAt?: string;
  isFeatured?: boolean;
  /** Ordem no banner principal (1 = primeiro) */
  featuredPosition?: number;
  popularity: number;
  /** Usado para gerar a arte provisória enquanto não há capa real */
  artSeed: number;
  posterUrl?: string;
  bannerUrl?: string;
  seasons: Season[];
};

/** Item da seção "Continuar Assistindo" */
export type WatchProgress = {
  episodeId: string;
  /** 0 a 100 */
  percent: number;
};
