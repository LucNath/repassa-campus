# Arquitetura

## Visão geral

O Repassa Campus é um monorepo com duas aplicações independentes:

```text
apps/web (React PWA) ── HTTP/JSON ──> apps/api (Fastify) ──> SQLite
```

O frontend nunca acessa o banco diretamente. A API concentra autenticação, autorização, validação, persistência e regras de venda/doação. Essa separação permite fazer deploy dos dois componentes em serviços diferentes e trocar o banco sem reescrever a interface.

## Estrutura

```text
apps/
  api/src/
    app.ts          rotas, schemas e tratamento de erros
    database.ts     schema SQLite e repositório de anúncios
    server.ts       inicialização HTTP
    app.test.ts     testes de integração da API
  web/
    public/         manifesto, ícone e Service Worker
    src/
      api.ts        cliente HTTP e contratos TypeScript
      App.tsx       interface e fluxos da aplicação
      App.test.tsx  testes de comportamento com API simulada
      styles.css    design responsivo
docs/               documentação técnica
```

## Modelo de anúncio

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | inteiro | gerado pelo banco |
| `userId` | texto | identifica o dono do anúncio |
| `title` | texto | 3–100 caracteres |
| `description` | texto | 10–1000 caracteres |
| `category` | enum | Livros, Computação, Engenharia, Saúde ou Outros |
| `price` | número/nulo | obrigatório em venda e nulo em doação |
| `isDonation` | booleano | define venda ou doação |
| `imageUrl` | URL | imagem pública simulada |
| `createdAt` | data | gerada pelo banco |

## Decisões

- **SQLite:** atende à persistência real sem exigir container ou conta externa, ideal para avaliação local.
- **Fastify + Zod:** oferece contrato REST pequeno, validação explícita e respostas JSON consistentes.
- **Autenticação JWT:** cadastro e login retornam um token de sete dias. Senhas são armazenadas somente como hashes bcrypt, e a API deriva o proprietário do token em vez de confiar em IDs enviados pelo navegador.
- **Autorização por proprietário:** criação, edição e exclusão exigem autenticação; alteração ou exclusão de anúncio alheio retorna `403`.
- **Cache network-first:** o Service Worker tenta buscar conteúdo atualizado e guarda respostas bem-sucedidas. Sem rede, usa o cache e, por último, o shell da aplicação.
- **Seed automático:** três itens são inseridos somente quando o banco está vazio, deixando a landing page demonstrável desde a primeira execução.

## Requisitos não funcionais

- Todas as entradas da API são validadas antes da persistência.
- Erros esperados retornam códigos HTTP adequados (`400`, `404`) e JSON.
- O layout reduz de três colunas para uma em telas de até 760 px.
- TypeScript está configurado em modo estrito nos dois projetos.

## Limitações conhecidas

- A política CORS está aberta durante o desenvolvimento e deve ser restringida no deploy.
- A sessão usa `localStorage`, uma escolha simples para o desafio; uma aplicação de maior risco deve avaliar cookies `HttpOnly` e proteção CSRF.
- O cache offline é propositalmente básico e ainda não possui expiração ou sincronização de escritas.
- URLs de imagem externas dependem da disponibilidade do provedor.
