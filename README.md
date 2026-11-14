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

## Páginas atuais (Etapa 1)

- `/` — Início (prévia visual do banner e carrossel)
- `/identidade` — Guia da identidade visual (página interna)
- `/admin` — Painel administrativo (estrutura)

## Organização das pastas

```
src/
├── app/                    → Páginas (cada pasta = um endereço do site)
│   ├── (cliente)/          → Área do cliente (com cabeçalho e menu do celular)
│   ├── admin/              → Painel administrativo (com menu lateral)
│   ├── globals.css         → Identidade visual: cores, fontes, animações
│   ├── layout.tsx          → Base de todas as páginas
│   └── manifest.ts         → Configuração do PWA (app instalável)
├── components/
│   ├── brand/              → Logo
│   ├── ui/                 → Peças reutilizáveis (botões, etiquetas, capas)
│   ├── layout/             → Cabeçalho, rodapé, menu inferior
│   └── admin/              → Componentes do painel
├── config/                 → Nome do site e itens dos menus
├── fonts/                  → Fontes Sora e Manrope (locais)
└── lib/                    → Funções auxiliares
public/icons/               → Ícones do PWA
scripts/                    → Ferramentas (gerador de ícones)
```

## Trocar a logo provisória

1. Edite o desenho em `src/components/brand/Logo.tsx` (ou substitua pelo SVG oficial).
2. Atualize o mesmo desenho em `scripts/generate-icons.mjs` e rode `npm run icons`.

## Roteiro

- [x] 1. Estrutura do projeto e identidade visual
- [ ] 2. Frontend completo da área do cliente
- [ ] 3. Frontend do painel administrativo
- [ ] 4. Integração com Supabase
- [ ] 5. Autenticação e permissões
- [ ] 6. Cadastro de doramas e episódios
- [ ] 7. Integração com Cloudflare R2
- [ ] 8. Player e progresso de reprodução
- [ ] 9. Usuários, planos e telas simultâneas
- [ ] 10. PWA, testes e publicação
