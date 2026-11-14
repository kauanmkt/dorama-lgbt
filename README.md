# Dorama LGBT

Plataforma de streaming de doramas: área do cliente + painel administrativo, instalável como app (PWA).

**Tecnologias:** Next.js 16 · TypeScript · Tailwind CSS 4 · Supabase · Cloudflare R2 · Vercel

## Como rodar no computador

Pré-requisito: [Node.js 20 ou superior](https://nodejs.org).

```bash
npm install      # instala as dependências (só na primeira vez)
npm run dev      # abre em http://localhost:3000
```

| Comando           | O que faz                                             |
| ----------------- | ----------------------------------------------------- |
| `npm run dev`     | Modo desenvolvimento (atualiza sozinho ao salvar)     |
| `npm run build`   | Gera a versão de produção (o mesmo que a Vercel faz)  |
| `npm run lint`    | Procura erros e más práticas no código                |
| `npm run icons`   | Recria os ícones do app a partir da logo              |

## Páginas atuais

**Área do cliente**
- `/` — Início: banner de destaques, Continuar assistindo, Lançamentos, Top 10, Minha lista e trilhos por categoria
- `/dorama/[slug]` — Página do dorama: banner, sinopse, temporadas, episódios e recomendações
- `/assistir/[episódio]` — Player em tela cheia (interface; vídeo real na Etapa 8)
- `/buscar` — Busca com filtros por categoria e ordenação
- `/doramas` — Catálogo completo
- `/categorias` e `/categoria/[slug]` — Navegação por categoria
- `/minha-lista` — Doramas salvos
- `/perfil` — Conta, plano e telas
- `/entrar`, `/cadastro`, `/recuperar-senha` — Telas de acesso

**Painel administrativo**
- `/admin` — Dashboard: números, alertas, conteúdo e usuários recentes
- `/admin/doramas` — Lista com busca, filtros, publicar/despublicar, destaque e exclusão
- `/admin/doramas/novo` e `/admin/doramas/[slug]` — Editor: informações, categorias,
  capa e banner, temporadas, episódios e envio de vídeo por episódio
- `/admin/videos` — Envio em lote (vínculo automático pelo nome do arquivo) e biblioteca do R2
- `/admin/categorias` — Criar, editar, excluir e ordenar (ordem = fileiras da home)
- `/admin/usuarios` — Busca, filtros por status, gaveta de detalhes (plano, validade,
  vitalício, telas extras, suspender) e "Liberar acesso" manual
- `/admin/planos` — Planos com prazo ou vitalícios, preço, duração e telas
- `/admin/configuracoes` — Dados da plataforma, regras de acesso e ordem dos destaques

> No painel, as alterações ainda ficam só na tela (somem ao recarregar).
> Elas passam a ser salvas de verdade a partir da Etapa 4.
> O endereço `novo` é reservado: nenhum dorama pode usar o slug "novo".

**Interna**
- `/identidade` — Guia da identidade visual

> Os dados atuais são fictícios e ficam em `src/lib/mock/catalog.ts`.
> Todas as telas leem o catálogo por `src/lib/catalog.ts` — na Etapa 4 só esse arquivo
> passa a consultar o Supabase.

## Prévia estática

`npm run build && npx next start -p 3100` e, em outro terminal,
`npm run preview -- http://localhost:3100` gera `preview/index.html`
(uma cópia visual do site num único arquivo, usada para acompanhamento).

## Organização das pastas

```
src/
├── app/                    → Páginas (cada pasta = um endereço do site)
│   ├── (cliente)/          → Área do cliente (com cabeçalho e menu do celular)
│   ├── (auth)/             → Login, cadastro e recuperação de senha
│   ├── assistir/           → Player (tela cheia)
│   ├── admin/              → Painel administrativo (com menu lateral)
│   ├── globals.css         → Identidade visual: cores, fontes, animações
│   ├── layout.tsx          → Base de todas as páginas
│   └── manifest.ts         → Configuração do PWA (app instalável)
├── components/
│   ├── brand/              → Logo
│   ├── ui/                 → Peças reutilizáveis (botões, etiquetas)
│   ├── catalog/            → Capas, carrosséis, destaque, episódios, busca
│   ├── player/             → Interface do player
│   ├── auth/               → Campos dos formulários de acesso
│   ├── admin/              → Telas e kit de componentes do painel
│   ├── layout/             → Cabeçalho, rodapé, menu inferior
│   └── admin/              → Componentes do painel
├── config/                 → Nome do site e itens dos menus
├── fonts/                  → Fontes Sora e Manrope (locais)
├── lib/
│   ├── catalog.ts          → Acesso ao catálogo (único ponto a trocar na Etapa 4)
│   ├── admin.ts            → Acesso aos dados do painel (idem)
│   ├── format.ts           → Datas, dinheiro, tamanhos e regras de status
│   └── mock/               → Dados fictícios temporários
└── types/                  → Formato dos dados (dorama, temporada, episódio...)
public/icons/               → Ícones do PWA
scripts/                    → Ferramentas (gerador de ícones)
```

## Trocar a logo provisória

1. Edite o desenho em `src/components/brand/Logo.tsx` (ou substitua pelo SVG oficial).
2. Atualize o mesmo desenho em `scripts/generate-icons.mjs` e rode `npm run icons`.

## Roteiro

- [x] 1. Estrutura do projeto e identidade visual
- [x] 2. Frontend completo da área do cliente
- [x] 3. Frontend do painel administrativo
- [ ] 4. Integração com Supabase
- [ ] 5. Autenticação e permissões
- [ ] 6. Cadastro de doramas e episódios
- [ ] 7. Integração com Cloudflare R2
- [ ] 8. Player e progresso de reprodução
- [ ] 9. Usuários, planos e telas simultâneas
- [ ] 10. PWA, testes e publicação
