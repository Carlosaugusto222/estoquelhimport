# Plano de SEO técnico — Estoque LH Import

## Realidade do projeto (importante ler antes)

Este é um **sistema interno de gestão de estoque atrás de login**. Só existem 3 rotas públicas indexáveis:

- `/` — hoje só redireciona para `/auth` ou `/estoque` (com `ssr: false`, não entrega HTML útil ao Google)
- `/auth` — tela de login
- `/privacidade` — política LGPD

Todas as rotas de negócio (`/estoque`, `/gerenciamento`) estão sob `_authenticated` e **não devem** ser indexadas.

Portanto o objetivo real aqui **não é** "indexação máxima de muitas páginas" — é:
1. Fazer a marca **"LH Import / Estoque LH Import"** aparecer bem quando alguém pesquisa pelo nome.
2. Garantir que o compartilhamento em WhatsApp/redes sociais mostre título, descrição e imagem corretos.
3. Impedir que o Google tente indexar áreas privadas.
4. Manter a política de privacidade encontrável (obrigação LGPD).

Se você quiser tráfego orgânico de verdade, precisaríamos criar páginas públicas de conteúdo (ex.: landing institucional da assistência, blog "quanto custa trocar tela iPhone X", páginas de serviço). Isso está **fora deste plano** — posso propor separadamente se fizer sentido.

## O que vou entregar

### 1. Landing pública real em `/`
Hoje `/` é um spinner com `ssr: false` — invisível ao Google. Transformar em uma landing SSR curta com:
- H1 "Estoque LH Import" + subtítulo explicando o sistema
- Botão "Entrar" → `/auth` e link para `/privacidade`
- Redirecionamento para `/estoque` só acontece **no cliente**, se já houver sessão (não bloqueia o HTML servido)
- `ssr: true` (padrão) para que crawlers recebam HTML completo

### 2. Meta tags por rota (head())
Cada rota pública ganha `title`, `description`, `og:title`, `og:description`, `og:url`, `canonical` próprios:

- `/` — "Estoque LH Import — Controle de telas e baterias" + descrição institucional
- `/auth` — "Entrar — Estoque LH Import" + `robots: noindex, follow` (páginas de login não devem ranquear)
- `/privacidade` — já tem meta boa; adicionar `canonical` (já tem) e revisar

O `og:image` atual vive no `__root.tsx` — vou movê-lo para as rotas leaf (regra do TanStack: og:image no root sobrescreve todos os filhos).

### 3. Sitemap dinâmico em `/sitemap.xml`
Criar `src/routes/sitemap[.]xml.ts` como server route (não estático), listando apenas:
- `/` (priority 1.0, changefreq weekly)
- `/privacidade` (priority 0.3, changefreq yearly)

`/auth` fica fora — não faz sentido indexar login.

### 4. `robots.txt`
Criar `public/robots.txt`:
```
User-agent: *
Allow: /
Disallow: /estoque
Disallow: /gerenciamento

Sitemap: https://estoquelhimport.lovable.app/sitemap.xml
```

### 5. Estrutura de headings
Auditar as 3 páginas públicas: **um único `<h1>` por página**, hierarquia `h2`/`h3` consistente. Hoje `/privacidade` tem `<h1>` no header repetido — corrigir para semântica correta (o título visível principal vira `h1`, os itens numerados são `h2`).

### 6. JSON-LD estruturado
No `__root.tsx`, adicionar schema **Organization** (nome, logo, URL) — ajuda o Google a exibir o nome/logo correto em resultados de marca.

### 7. Pequenos ajustes técnicos
- `<html lang="en">` → `<html lang="pt-BR">` (o conteúdo é português; afeta ranqueamento local e leitores de tela)
- Adicionar `<meta name="robots" content="index, follow">` explícito nas páginas públicas
- Adicionar `<link rel="canonical">` em `/` (leaf, não no root)
- Garantir `alt` significativo em todas as imagens (logo já tem; verificar demais)

## Detalhes técnicos

```text
Arquivos criados:
  src/routes/sitemap[.]xml.ts     server route dinâmico
  public/robots.txt               regras de crawl

Arquivos editados:
  src/routes/__root.tsx           lang="pt-BR"; remover og:image daqui;
                                  adicionar JSON-LD Organization
  src/routes/index.tsx            virar landing SSR real com H1+CTA,
                                  head() próprio, og:image, canonical
  src/routes/auth.tsx             head() com noindex,follow
  src/routes/privacidade.tsx      corrigir hierarquia de headings
```

Nada muda no backend, nas rotas autenticadas ou no design system. O visual da landing seguirá o mesmo estilo (Outfit/Figtree, tokens existentes).

## O que este plano **não** faz (e por quê)

- **Não** cria blog, páginas de serviço ou landing de marketing — o projeto atual é um app interno; conteúdo público é uma decisão de produto separada.
- **Não** promete "indexação máxima" — com 2-3 páginas públicas, o teto é você aparecer bem para buscas pelo nome da marca. Isso é honesto.
- **Não** integra Google Search Console / Analytics automaticamente — posso fazer depois com sua confirmação (envolve verificação de propriedade).

Se preferir focar só em um subconjunto (ex.: só sitemap + robots + og:image), me diga.
