# Repassa Campus

Marketplace de economia circular criado para aproximar estudantes que querem vender, doar ou encontrar materiais dentro do campus. A solução integra uma API REST com persistência SQLite e uma interface React responsiva e instalável como PWA.

## Funcionalidades

- Vitrine pública com busca e filtros por categoria;
- cadastro de venda ou doação com validação;
- área "Meus anúncios" com edição e exclusão de itens;
- cadastro, login e sessão JWT com senha protegida por hash;
- autorização para editar ou excluir apenas anúncios próprios;
- estatísticas obtidas da API;
- API CRUD em JSON e banco SQLite;
- manifesto, ícone, Service Worker e cache básico para instalação/offline;
- layout adaptado para desktop e celular.

## Tecnologias

- Frontend: React 19, TypeScript e Vite;
- Backend: Node.js, Fastify, Zod, JWT, bcrypt e TypeScript;
- Dados: SQLite com `better-sqlite3`;
- Qualidade: Vitest, React Testing Library, jsdom e TypeScript em modo estrito;
- Organização: npm workspaces em monorepo.

## Como executar

Pré-requisito: Node.js 22 ou superior e npm 10 ou superior.

```bash
npm install
npm run dev
```

A interface estará em `http://localhost:5173` e a API em `http://localhost:3333`. Na primeira execução, o backend cria `data/repassa.db` e inclui três anúncios de demonstração.

Para validar o projeto:

```bash
npm test
npm run typecheck
npm run build
```

O comando `npm test` executa os testes de integração da API e os testes de comportamento da interface. No frontend, a API é simulada para verificar filtros, anúncios próprios, vendas, doações, edições, exclusões, estatísticas e estados de erro sem depender de um servidor aberto.

Variáveis opcionais podem ser copiadas de `.env.example`.

## Deploy

O projeto está preparado para publicar frontend e API separadamente:

- `vercel.json` configura o build do app Vite em monorepo;
- `render.yaml` configura a API Node.js no Render;
- `docs/DEPLOY.md` traz o passo a passo e as variáveis de produção.

Em produção, configure:

```text
VITE_API_URL=https://sua-api-publica
CORS_ORIGIN=https://seu-front-publico
JWT_SECRET=uma-chave-longa-e-segura
```

## API REST

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/health` | Verifica a saúde da API |
| `POST` | `/auth/register` | Cria uma conta e retorna a sessão JWT |
| `POST` | `/auth/login` | Autentica com e-mail e senha |
| `GET` | `/auth/me` | Consulta o usuário autenticado |
| `GET` | `/listings` | Lista e filtra por `category`, `userId` e `search` |
| `GET` | `/listings/:id` | Consulta um anúncio |
| `POST` | `/listings` | Cria um anúncio autenticado |
| `PUT` | `/listings/:id` | Atualiza um anúncio do usuário autenticado |
| `DELETE` | `/listings/:id` | Exclui um anúncio do usuário autenticado |
| `GET` | `/stats` | Retorna estatísticas da plataforma |

Detalhes da arquitetura, decisões e formato dos dados estão em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Diário de Bordo da IA

### Ferramentas utilizadas

- OpenAI Codex: análise do edital, definição da arquitetura, implementação, documentação, testes, autenticação e preparação de deploy.

### Estratégia de engenharia de prompts

Prompts reais usados no projeto devem ser preservados aqui. O primeiro prompt foi:

> "vamos analisar, criar docs do projeto e começar a implementar" acompanhado do edital completo em PDF.

Esse pedido foi refinado operacionalmente em três objetivos: rastrear cada requisito do edital, escolher uma arquitetura simples de explicar no vídeo e entregar uma fatia vertical verificável: banco, API, interface e PWA.

Exemplos sugeridos para registrar nas próximas sessões:

1. "Revise o Service Worker desta PWA considerando cache de assets e respostas da API. Aponte riscos de dados obsoletos e proponha uma estratégia simples que funcione offline."
2. "Analise os testes da API Fastify e identifique cenários ausentes para validação, filtro e autorização por usuário, sem alterar o contrato atual."

### Compartilhamento de histórico

Adicione aqui um link público da conversa de desenvolvimento, caso a ferramenta utilizada permita compartilhamento.

### Reflexão crítica

Na primeira implementação, a IA precisa ser tratada como autora de uma proposta, não como fonte de verdade. Um exemplo concreto desta sessão foi a tentativa inicial de extrair o PDF com uma ferramenta que não existia no ambiente. O erro foi identificado pela saída do terminal; a abordagem foi corrigida e validada antes de definir o escopo.

Ao longo do projeto, esta seção deve receber também exemplos de decisões de código revisadas pelo candidato.

## Próximas entregas

- Upload de imagens em vez de somente URL;
- auditoria Lighthouse;
- deploy da API e frontend;
- roteiro e gravação do vídeo de até seis minutos.

## Licença

Projeto desenvolvido para o Processo Seletivo Vortex 2026.
