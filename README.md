# Alcobaça Store

Projeto multipágina para GitHub Pages + Supabase.

## Páginas
- `index.html` — homepage
- `produtos.html` — catálogo com pesquisa/filtros/sort
- `produto.html?id=...` — ficha individual do produto
- `conta.html` — conta do cliente
- `pedidos.html` — pedidos e mensagens
- `gestao.html` — backoffice staff/owner
- `suporte.html` — centro de ajuda
- `privacidade.html` — texto base de privacidade/cookies
- `style.css` — sistema visual responsivo
- `script.js` — produtos, navegação, Auth, tickets e gestão
- `supabase-schema.sql` — backend PostgreSQL/RLS

## Design
A estrutura é deliberadamente multipágina, com navegação de cabeçalho, pesquisa, categorias, catálogo separado, páginas individuais de produto e áreas de cliente/staff. A linguagem visual é branca, editorial e comercial, inspirada na organização de grandes lojas de tecnologia, sem copiar a identidade visual de nenhuma delas.

## Configuração
No início de `script.js` substitui:

```js
SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY',
```

Nunca coloques a `service_role` key no frontend.

## Produtos
No array `PRODUCTS` de `script.js`, copia um objeto e altera `id`, `name`, `description`, `price`, `image`, `gallery`, `category`, `badge`, `shipping`, `availability` e `specs`.

## Owner
Depois de entrares pela primeira vez com `miguelbento257@gmail.com`:

```sql
update public.profiles
set role = 'owner'
where lower(email) = lower('miguelbento257@gmail.com');
```

## GitHub Pages
Mantém os ficheiros HTML na raiz publicada do repositório. GitHub Pages fornece o frontend estático; Supabase trata do Auth, base de dados, RLS e tickets.

## Importante
Antes de abrir a loja ao público, configura SMTP real, Google OAuth, URLs de redirect e política legal definitiva.
