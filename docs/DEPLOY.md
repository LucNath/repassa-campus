# Deploy

Este projeto foi preparado para deploy com frontend e API separados:

- Web: Vercel, Netlify ou outro host estatico para Vite.
- API: Render, Railway ou Fly.io executando Node.js.

## 1. API no Render

1. Acesse o Render e crie um novo Blueprint a partir do repositorio GitHub.
2. Selecione `LucNath/repassa-campus`.
3. O Render vai ler o arquivo `render.yaml`.
4. Configure a variavel `CORS_ORIGIN` com a URL final do frontend.
5. Publique o servico.

O blueprint ja define:

- Build: `npm ci && npm run build -w @repassa/api`
- Start: `npm run start -w @repassa/api`
- Health check: `/health`
- Banco SQLite em `./data/repassa.db`
- `JWT_SECRET` gerado automaticamente

No plano free do Render, o filesystem e efemero: os dados podem ser perdidos em redeploys ou reinicios. Para uma demo de portfolio isso e aceitavel. Para persistencia real, use um servico pago com Persistent Disk ou migre o banco para Postgres.

Depois do deploy, copie a URL publica da API. Exemplo:

```text
https://repassa-campus-api.onrender.com
```

## 2. Web na Vercel

1. Acesse a Vercel e importe o mesmo repositorio GitHub.
2. Mantenha o projeto na raiz do monorepo.
3. A Vercel vai ler o arquivo `vercel.json`.
4. Configure a variavel `VITE_API_URL` com a URL publica da API.
5. Publique o frontend.

O arquivo `vercel.json` ja define:

- Install: `npm ci`
- Build: `npm run build -w @repassa/web`
- Output: `apps/web/dist`
- Rewrite SPA para rotas do React

## 3. Voltar no Render e fechar CORS

Quando a Vercel gerar a URL publica do frontend, volte no Render e ajuste:

```text
CORS_ORIGIN=https://sua-url-da-vercel.vercel.app
```

Para permitir mais de uma origem, use virgulas:

```text
CORS_ORIGIN=https://app.vercel.app,http://localhost:5173
```

## 4. Checklist de validacao

- Abrir a URL do frontend.
- Criar uma conta.
- Fazer login.
- Publicar uma venda.
- Publicar uma doacao.
- Editar um anuncio proprio.
- Excluir um anuncio proprio.
- Recarregar a pagina e confirmar que a sessao continua ativa.
