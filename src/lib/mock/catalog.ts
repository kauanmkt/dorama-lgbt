/**
 * CATÁLOGO FICTÍCIO — usado só até a integração com o Supabase (Etapa 4).
 * Títulos e histórias inventados apenas para testar o visual.
 */
import type { Category, Dorama, Episode, Season, WatchProgress } from "@/types/catalog";

export const mockCategories: Category[] = [
  { slug: "bl", name: "BL", description: "Boys' Love: histórias de amor entre homens." },
  { slug: "gl", name: "GL", description: "Girls' Love: histórias de amor entre mulheres." },
  { slug: "romance", name: "Romance", description: "Para suspirar do começo ao fim." },
  { slug: "drama", name: "Drama", description: "Emoção, conflitos e reviravoltas." },
  { slug: "comedia", name: "Comédia", description: "Leves, divertidos e apaixonantes." },
  { slug: "escolar", name: "Escolar", description: "Amores de colégio e universidade." },
  { slug: "fantasia", name: "Fantasia", description: "Magia, destino e o impossível." },
  { slug: "misterio", name: "Mistério", description: "Segredos que prendem a atenção." },
];

type Seed = Omit<Dorama, "id" | "seasons"> & { seasonEpisodes: number[] };

const seeds: Seed[] = [
  {
    slug: "amor-em-seul",
    title: "Amor em Seul",
    tagline: "Um contrato de seis meses. Um coração sem prazo de validade.",
    synopsis:
      "Ji-ho aceita fingir um namoro com o herdeiro de uma rede de hotéis para salvar a cafeteria da família. O que era só um acordo começa a ficar real demais — e perigoso demais para os dois.",
    year: 2026,
    country: "Coreia do Sul",
    ageRating: "14",
    categories: ["bl", "romance", "drama"],
    status: "em_exibicao",
    isNew: true,
    isFeatured: true,
    popularity: 98,
    artSeed: 0,
    seasonEpisodes: [12],
  },
  {
    slug: "ceu-de-bangkok",
    title: "Céu de Bangkok",
    tagline: "Dois pilotos rivais. Um único céu.",
    synopsis:
      "Na academia de aviação mais disputada da Tailândia, Phum e Win competem pela última vaga de comandante. Entre treinos noturnos e voos de teste, a rivalidade vira algo que nenhum dos dois sabe pilotar.",
    year: 2025,
    country: "Tailândia",
    ageRating: "14",
    categories: ["bl", "romance", "drama"],
    status: "completo",
    isFeatured: true,
    popularity: 95,
    artSeed: 4,
    seasonEpisodes: [10, 8],
  },
  {
    slug: "duas-luas",
    title: "Duas Luas",
    tagline: "Ela escreve finais felizes. Até conhecer a sua.",
    synopsis:
      "Uma roteirista em crise criativa aluga um quarto na casa de uma fotógrafa misteriosa em Taipei. Entre noites de insônia e fotografias reveladas à mão, nasce uma história que nenhuma das duas planejou.",
    year: 2026,
    country: "Taiwan",
    ageRating: "12",
    categories: ["gl", "romance"],
    status: "em_exibicao",
    isNew: true,
    isFeatured: true,
    popularity: 91,
    artSeed: 3,
    seasonEpisodes: [8],
  },
  {
    slug: "segredo-do-campus",
    title: "Segredo do Campus",
    tagline: "Todo grêmio estudantil guarda um segredo.",
    synopsis:
      "Quando o presidente do grêmio descobre que o novo aluno transferido é o autor anônimo do blog que expõe a escola, os dois fazem um pacto: silêncio em troca de ajuda. Só não contavam com os sentimentos.",
    year: 2025,
    country: "Tailândia",
    ageRating: "12",
    categories: ["bl", "escolar", "comedia"],
    status: "completo",
    popularity: 89,
    artSeed: 5,
    seasonEpisodes: [12],
  },
  {
    slug: "cafe-das-7",
    title: "Café das 7",
    tagline: "O pedido de sempre. Um sentimento novo.",
    synopsis:
      "Todos os dias, às sete da manhã, o mesmo cliente pede o mesmo café sem dizer uma palavra. O barista decide descobrir quem ele é — e acaba descobrindo muito sobre si mesmo.",
    year: 2024,
    country: "Japão",
    ageRating: "L",
    categories: ["bl", "romance", "comedia"],
    status: "completo",
    popularity: 84,
    artSeed: 2,
    seasonEpisodes: [8],
  },
  {
    slug: "melodia-proibida",
    title: "Melodia Proibida",
    tagline: "Algumas canções não foram feitas para serem esquecidas.",
    synopsis:
      "Uma violinista prodígio e a herdeira rebelde de uma gravadora se reencontram dez anos depois de um escândalo que separou as duas. Agora, uma última apresentação pode mudar tudo.",
    year: 2025,
    country: "Coreia do Sul",
    ageRating: "16",
    categories: ["gl", "drama", "romance"],
    status: "completo",
    popularity: 87,
    artSeed: 1,
    seasonEpisodes: [10],
  },
  {
    slug: "luz-de-neon",
    title: "Luz de Neon",
    tagline: "A cidade nunca dorme. Nem os segredos dele.",
    synopsis:
      "Um detetive novato e um informante que vive nas sombras de Hong Kong precisam trabalhar juntos para resolver uma série de desaparecimentos. A verdade está mais perto do que eles imaginam.",
    year: 2026,
    country: "China",
    ageRating: "16",
    categories: ["bl", "misterio", "drama"],
    status: "em_exibicao",
    isNew: true,
    popularity: 82,
    artSeed: 6,
    seasonEpisodes: [6],
  },
  {
    slug: "petalas-de-outono",
    title: "Pétalas de Outono",
    tagline: "Um amor que floresce fora de época.",
    synopsis:
      "Duas floristas de bairros rivais em Kyoto disputam o contrato do festival de outono da cidade. Arranjo após arranjo, a competição vira cumplicidade.",
    year: 2024,
    country: "Japão",
    ageRating: "L",
    categories: ["gl", "romance", "comedia"],
    status: "completo",
    popularity: 76,
    artSeed: 7,
    seasonEpisodes: [8],
  },
  {
    slug: "promessa-de-verao",
    title: "Promessa de Verão",
    tagline: "Eles prometeram voltar. Só um cumpriu.",
    synopsis:
      "Dez anos depois de um verão inesquecível numa ilha das Filipinas, Paolo volta para cumprir uma promessa de infância — e encontra Miguel prestes a se casar.",
    year: 2025,
    country: "Filipinas",
    ageRating: "12",
    categories: ["bl", "romance", "drama"],
    status: "completo",
    popularity: 80,
    artSeed: 8,
    seasonEpisodes: [10],
  },
  {
    slug: "jardim-de-inverno",
    title: "Jardim de Inverno",
    tagline: "Há flores que só nascem no frio.",
    synopsis:
      "Uma jovem herda uma estufa abandonada e descobre que ela guarda um portal para o passado — e para a mulher que a construiu cem anos atrás.",
    year: 2026,
    country: "Coreia do Sul",
    ageRating: "12",
    categories: ["gl", "fantasia", "romance"],
    status: "em_exibicao",
    isNew: true,
    popularity: 79,
    artSeed: 9,
    seasonEpisodes: [8],
  },
  {
    slug: "linhas-cruzadas",
    title: "Linhas Cruzadas",
    tagline: "Uma ligação errada. A pessoa certa.",
    synopsis:
      "Um atendente de call center noturno e um insone que liga todas as madrugadas criam uma amizade sem rostos. Até que um dia decidem se encontrar.",
    year: 2023,
    country: "Taiwan",
    ageRating: "L",
    categories: ["bl", "comedia", "romance"],
    status: "completo",
    popularity: 72,
    artSeed: 10,
    seasonEpisodes: [8],
  },
  {
    slug: "tinta-e-seda",
    title: "Tinta e Seda",
    tagline: "Na corte, cada pincelada é um risco.",
    synopsis:
      "Na China imperial, um pintor da corte é encarregado de retratar o príncipe exilado. Entre sessões secretas e intrigas palacianas, nasce um sentimento que pode custar a vida dos dois.",
    year: 2024,
    country: "China",
    ageRating: "14",
    categories: ["bl", "drama", "fantasia"],
    status: "completo",
    popularity: 86,
    artSeed: 11,
    seasonEpisodes: [12],
  },
  {
    slug: "entre-ondas",
    title: "Entre Ondas",
    tagline: "Ela queria a onda perfeita. Encontrou outra coisa.",
    synopsis:
      "Uma surfista profissional machucada volta para a vila de pescadores onde cresceu e precisa aprender a confiar de novo — no mar e na instrutora local que não sai do seu caminho.",
    year: 2025,
    country: "Tailândia",
    ageRating: "L",
    categories: ["gl", "drama", "romance"],
    status: "completo",
    popularity: 74,
    artSeed: 12,
    seasonEpisodes: [6],
  },
  {
    slug: "ultimo-trem",
    title: "Último Trem",
    tagline: "Toda noite, o mesmo vagão. Toda noite, ele.",
    synopsis:
      "Dois desconhecidos se encontram todas as noites no último trem de Tóquio. Sem saber o nome um do outro, compartilham histórias — até que um deles para de aparecer.",
    year: 2026,
    country: "Japão",
    ageRating: "12",
    categories: ["bl", "misterio", "romance"],
    status: "em_exibicao",
    isNew: true,
    popularity: 88,
    artSeed: 13,
    seasonEpisodes: [8],
  },
];

const episodeTitles = [
  "O primeiro encontro",
  "Regras do jogo",
  "Uma noite inesperada",
  "Ciúme",
  "Entre a verdade e a mentira",
  "O passado bate à porta",
  "Escolhas",
  "Longe demais",
  "Confissão",
  "Tempestade",
  "Antes do amanhecer",
  "Para sempre",
];

function buildSeasons(slug: string, counts: number[]): Season[] {
  return counts.map((count, s) => ({
    number: s + 1,
    episodes: Array.from({ length: count }, (_, i): Episode => ({
      id: `${slug}-t${s + 1}e${i + 1}`,
      doramaSlug: slug,
      season: s + 1,
      number: i + 1,
      title: episodeTitles[(i + s * 3) % episodeTitles.length],
      synopsis:
        "Descrição do episódio cadastrada pelo painel administrativo. Um resumo curto, sem revelar spoilers importantes.",
      durationMin: 42 + ((i * 7 + s * 5) % 18),
    })),
  }));
}

export const mockDoramas: Dorama[] = seeds.map(({ seasonEpisodes, ...d }, i) => ({
  ...d,
  id: String(i + 1),
  seasons: buildSeasons(d.slug, seasonEpisodes),
}));

/** Simula o progresso do usuário logado */
export const mockProgress: WatchProgress[] = [
  { episodeId: "amor-em-seul-t1e4", percent: 62 },
  { episodeId: "ceu-de-bangkok-t2e3", percent: 35 },
  { episodeId: "duas-luas-t1e2", percent: 80 },
  { episodeId: "ultimo-trem-t1e1", percent: 15 },
];

/** Simula a "Minha Lista" do usuário logado */
export const mockMyList: string[] = [
  "melodia-proibida",
  "jardim-de-inverno",
  "tinta-e-seda",
  "luz-de-neon",
  "cafe-das-7",
];
