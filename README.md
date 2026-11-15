# Dorama LGBT

Plataforma de streaming de doramas: área do cliente + painel administrativo, instalável como app (PWA).

**Tecnologias:** Next.js 16 · TypeScript · Tailwind CSS 4 · Supabase · Cloudflare R2 · Vercel

## Banco de dados (Supabase)

Arquivos em `supabase/`:

| Arquivo | Para que serve | Quando rodar |
| --- | --- | --- |
| `migrations/0001_estrutura_inicial.sql` | Cria tabelas, relações, regras de segurança (RLS) e funções | **Uma vez**, num projeto novo |
| `seed-demo.sql` | Catálogo, categorias e planos de demonstração (fictícios) | Opcional, para testar |
| `remover-demo.sql` | Apaga os doramas e planos de demonstração | Antes de lançar |
| `migrations/0002_login_por_email.sql` | Ajustes para o login só com e-mail | **Uma vez**, depois da 0001 |
| `migrations/0003_restringir_funcoes.sql` | Funções de conta só para quem está logado | **Uma vez**, depois da 0002 |
| `tornar-admin.sql` | Transforma uma conta em administradora | Depois de criar sua conta de admin |

**Como aplicar:** Supabase → **SQL Editor** → **New query** → colar o conteúdo → **Run**.

### O que o banco guarda

- **Catálogo:** `doramas`, `seasons` (temporadas), `episodes`, `categories`, `dorama_categories`
- **Vídeos:** `videos` — caminho do arquivo no R2 (só admin enxerga)
- **Contas:** `profiles` (criado sozinho no cadastro), `admins`
- **Acesso:** `plans`, `subscriptions` (acesso atual de cada cliente), `payments`
- **Uso:** `favorites` (Minha Lista), `watch_progress`, `playback_sessions` (telas)
- **Configurações:** `settings`

### Segurança (RLS)

Todas as tabelas têm regras no próprio banco — o app nunca decide sozinho:
- Visitantes veem só doramas **publicados**; rascunhos e vídeos ficam invisíveis.
- Cada cliente vê e altera apenas a própria lista, progresso, perfil e assinatura.
- Ninguém consegue se tornar admin ou estender o próprio acesso pelo app.
- O caminho dos vídeos nunca é exposto: o link para assistir é gerado no servidor (Etapa 7).

Teste automático das regras (47 verificações, roda num Postgres local):
`cd scripts/db-tests && npm i @electric-sql/pglite && node test-banco.mjs ../..`

Teste de ponta a ponta do login (20 verificações) com um Supabase simulado:
`node fake-supabase2.mjs ../..` + build com `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
e `SUPABASE_SECRET_KEY=test-secret` + `python3 teste-login-e2e.py` (requer Playwright).

### Como o catálogo chega às telas

`src/lib/catalog.ts` lê todo o catálogo publicado numa única consulta e guarda em cache
(renova a cada 5 minutos, ou na hora quando o painel publicar algo — Etapa 6).
Sem Supabase configurado, o app usa os dados fictícios.

## Login e permissões

**Cliente — só com e-mail.** A pessoa digita o e-mail da compra; o servidor confere se
existe conta com assinatura ativa e abre a sessão. Sem assinatura ativa, não entra
(e vê o link de compra, se configurado em `settings.purchase_url`).
A mensagem de erro é a mesma para "não existe", "sem plano" e "admin", para não revelar
quem é cliente.

**Administrador — e-mail e senha**, em `/admin/entrar`. Contas de admin nunca entram
só com e-mail. Cada tela e cada ação do painel conferem no servidor se a pessoa é admin
(tabela `admins`), e o banco (RLS) confere de novo.

**Porteiro (`src/proxy.ts`).** Sem login, qualquer página leva ao login (do cliente ou
do painel). O player ainda confere se a assinatura está ativa antes de abrir.

**Liberar acesso.** `src/lib/access.ts → grantAccess()` cria a conta (se não existir) e
ativa/renova o plano — renovação antecipada soma os dias restantes. É usada pelo botão
"Liberar acesso" do painel e será usada pelo webhook da plataforma de pagamento.
`revokeAccess()` encerra o acesso (reembolso/chargeback).

### Configuração única no Supabase

1. Rodar `migrations/0002_login_por_email.sql` no SQL Editor.
2. **Authentication → Users → Add user → Create new user**: seu e-mail de admin + senha
   forte, marcando **Auto Confirm User**.
3. Rodar `tornar-admin.sql` (trocando o e-mail pelo seu).
4. **Authentication → Sign In / Providers → Email**: desligar **Allow new users to sign up**
   (contas de clientes só são criadas pelo sistema: painel ou webhook).
5. Variável `SUPABASE_SECRET_KEY` (Project Settings → API Keys → Secret key) no
   `.env.local` e na Vercel — nunca no código.

## Como rodar no computador

Pré-requisito: [Node.js 20 ou superior](https://nodejs.org).

Copie `.env.example` para `.env.local` e preencha a URL e a chave publishable do Supabase
(o arquivo `.env.local` já vem preenchido com o seu projeto).

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
| `npm run seed`    | Regera `supabase/seed-demo.sql` a partir dos dados fictícios |

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
- `/entrar` — Login do cliente (só o e-mail da compra)

**Painel administrativo** (login próprio em `/admin/entrar`, com senha)
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
│   ├── catalog.ts          → Acesso ao catálogo (Supabase com cache, ou dados fictícios)
│   ├── supabase/           → Conexões com o Supabase (visitante, usuário logado, navegador, servidor)
│   ├── auth.ts             → Quem está logado? É admin? Qual o plano?
│   ├── access.ts           → Liberar/encerrar acesso e login só com e-mail
│   ├── admin-actions.ts    → Ações do painel (sempre verificam admin)
│   ├── admin.ts            → Acesso aos dados do painel (idem)
│   ├── format.ts           → Datas, dinheiro, tamanhos e regras de status
│   └── mock/               → Dados fictícios temporários
└── types/                  → Formato dos dados (dorama, temporada, episódio...)
public/icons/               → Ícones do PWA
supabase/                   → Estrutura do banco (SQL) e dados de demonstração
scripts/                    → Ferramentas (gerador de ícones)
```

## Trocar a logo provisória

1. Edite o desenho em `src/components/brand/Logo.tsx` (ou substitua pelo SVG oficial).
2. Atualize o mesmo desenho em `scripts/generate-icons.mjs` e rode `npm run icons`.

## Roteiro

- [x] 1. Estrutura do projeto e identidade visual
- [x] 2. Frontend completo da área do cliente
- [x] 3. Frontend do painel administrativo
- [x] 4. Integração com Supabase
- [x] 5. Autenticação e permissões
- [ ] 6. Cadastro de doramas e episódios
- [ ] 7. Integração com Cloudflare R2
- [ ] 8. Player e progresso de reprodução
- [ ] 9. Usuários, planos e telas simultâneas
- [ ] 10. PWA, testes e publicação
