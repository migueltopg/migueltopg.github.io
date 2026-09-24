# Alcobaça Store — Loja de seleção e negociação

Projeto estático profissional pensado para GitHub Pages + Supabase, com identidade visual clara e editorial.

## Ficheiros

- `index.html` — estrutura completa da loja, autenticação, produto, tickets, staff e cookies.
- `style.css` — design responsivo.
- `script.js` — lógica da loja, produtos, Supabase Auth e tickets.
- `supabase-schema.sql` — tabelas, RLS, trigger de perfil e permissões.
- `images/` — coloca aqui a tua `profile.png` e as imagens dos produtos.

## 1. Criar o Supabase

1. Cria um projeto em Supabase.
2. Abre SQL Editor e executa `supabase-schema.sql`.
3. Em Project Settings → API, copia o Project URL e a Publishable/Anon Key.
4. Em `script.js`, preenche:

```js
SUPABASE_URL: 'https://o-teu-project.supabase.co',
SUPABASE_ANON_KEY: 'a-tua-chave-publica',
```

Nunca coloques a `service_role` key no site.

## 2. Login Google

No Supabase: Authentication → Sign In / Providers → Google.

No Google Cloud, cria/configura o OAuth Client e usa como callback:

`https://<project-ref>.supabase.co/auth/v1/callback`

No Supabase URL Configuration, adiciona o URL final do GitHub Pages como Site URL e Redirect URL.

## 3. Código enviado por email

O frontend usa `signInWithOtp()` do Supabase.

Para produção, configura Custom SMTP em Supabase Auth. O SMTP predefinido do Supabase é limitado a endereços autorizados e tem limites, pelo que não é a opção certa para uma loja real.

O email que envia os códigos é configurado no SMTP do Supabase; não deves guardar a password SMTP no `script.js`.

## 4. Tornar a tua conta owner

1. Entra uma primeira vez no site.
2. Volta ao SQL Editor.
3. Executa:

```sql
update public.profiles
set role = 'owner'
where lower(email) = lower('miguelbento257@gmail.com');
```

Depois faz refresh do site ou volta a entrar.

O painel de staff é protegido também pelo RLS da base de dados.

## 5. Adicionar produtos

No início de `script.js`, encontra:

```js
const PRODUCTS = [
  {
    id: 'exemplo-produto',
    name: 'Produto Exemplo',
    description: 'Descrição...',
    price: 29.90,
    image: 'images/exemplo.png',
    gallery: ['images/exemplo.png'],
    category: 'Destaque',
    badge: 'NOVO',
    shipping: 'Envio nacional',
    availability: 'Disponível',
  },
];
```

Copia o objeto `{ ... }`, cola logo abaixo, muda o `id`, nome, descrição, preço e nomes das imagens.

Exemplo:

```js
{
  id: 'auriculares-x1',
  name: 'Auriculares X1',
  description: 'Auriculares sem fios com estojo de carregamento.',
  price: 39.90,
  image: 'images/auriculares-x1.png',
  gallery: [
    'images/auriculares-x1.png',
    'images/auriculares-x1-2.png'
  ],
  category: 'Tecnologia',
  badge: 'NOVO',
  shipping: 'Envio nacional',
  availability: 'Disponível',
},
```

## 6. GitHub Pages

Submete `index.html`, `style.css`, `script.js`, `supabase-schema.sql`, `README.md` e a pasta `images` para o repositório.

Em Settings → Pages escolhe a branch/pasta que contém `index.html`.

O GitHub Pages é ideal aqui porque o site é estático. O Supabase faz o trabalho que não pode ser feito com apenas HTML/CSS/JS no GitHub Pages: autenticação, sessão, base de dados e regras de acesso.

## 7. Antes de abrir a loja ao público

- Configura SMTP real.
- Configura Google OAuth e URLs de redirect.
- Testa login com Google e email OTP.
- Testa RLS com uma conta normal.
- Adiciona uma página legal real com os dados da entidade responsável pelo negócio.
- Confirma fornecedores, prazos, devoluções, pagamentos, faturação e regras aplicáveis em Portugal.
