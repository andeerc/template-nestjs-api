# NestJS API Scaffold

Base para APIs REST com NestJS, Fastify, PostgreSQL e Redis, organizada em módulos `feature-first`.

Este README foi ajustado para refletir o estado real do projeto hoje. A base já oferece bootstrap sólido de infraestrutura, documentação automática e exemplos de `auth` e `users`, mas ainda não fecha todos os fluxos de produto prometidos pela documentação antiga.

## Estado Atual

### O que já existe

- Bootstrap com `NestJS + Fastify`
- PostgreSQL com `Knex + Objection.js`
- Redis conectado para `session`, `cache`, `Bull` e adapter de `socket.io`
- Módulo `auth` com `POST /auth/login`
- Módulo `users` com CRUD via `use-cases + Objection.js`
- Swagger JSON/YAML e interface Scalar em `/docs`
- Inferência automática de envelopes de resposta para a documentação

### O que ainda está incompleto

- O login valida email e senha, mas **não grava a sessão** e **não emite JWT**
- O `AuthGuard` exige `request.session.authenticated` e `request.session.userId` para rotas protegidas
- Na prática, o CRUD de `users` está protegido, mas a própria API ainda não oferece um fluxo completo para autenticar e então consumir essas rotas
- A validação HTTP está padronizada com `Zod`
- SMTP é validado no boot via ambiente, embora ainda não exista uma feature pública de email na base
- `cache`, `queue` e `websocket` estão ligados na infraestrutura, mas não há exemplos de rota com cache, processor do Bull ou gateway socket implementados
- Existe script `test:e2e`, mas não há pasta `test/` no repositório neste momento

### Status da documentação auxiliar

Arquivos como `QUICK_START.md`, `AUTH_EXAMPLE.md` e `ZOD_MIGRATION_GUIDE.md` descrevem uma visão mais otimista da base do que o código realmente entrega hoje. Até eles serem alinhados, trate este `README.md` como a referência principal.

## Stack

- `NestJS 11`
- `Fastify`
- `Knex`
- `Objection.js`
- `PostgreSQL`
- `Redis`
- `Bull`
- `Socket.IO`
- `nestjs-zod` + `zod`
- `Swagger` + `Scalar`

## Arquitetura

```text
src/
├── modules/
│   ├── auth/
│   │   ├── application/use-cases/
│   │   └── presentation/http/
│   └── users/
│       ├── application/use-cases/
│       ├── domain/
│       ├── infrastructure/persistence/
│       └── presentation/http/
├── shared/
│   ├── http/
│   ├── infrastructure/
│   └── session-storage/
└── config/
```

### Módulos reais da base

- `auth`
  - expõe `POST /auth/login`
  - usa `LoginUseCase`
  - valida request com `Zod`
  - compara senha com `bcrypt`
- `users`
  - expõe CRUD HTTP
  - usa `Zod` + `use-cases` explícitos
  - persiste `User` com `Objection.js` sobre `Knex`
  - usa conversão global `camelCase <-> snake_case` na camada de banco
- `shared/infrastructure`
  - centraliza banco, cache, fila e session storage

## Setup

### 0. Personalize o template

```bash
npm run bootstrap
```

O script de bootstrap pergunta o nome do projeto, o nome do pacote npm e a descrição da aplicação. Depois ele atualiza `package.json`, `package-lock.json` quando existir, `README.md`, `QUICK_START.md` e as variáveis `APP_NAME` / `APP_DESCRIPTION` em `.env` e `.env.example`.

### 1. Instale dependências

```bash
npm install
```

### 2. Configure ambiente

```bash
cp .env.example .env
```

O arquivo `.env.example` já contém os valores locais esperados para PostgreSQL e Redis. Mesmo sem feature de email pronta, o projeto valida estas variáveis no startup:

- `SESSION_SECRET`
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`
- `APP_URL`

### 3. Suba PostgreSQL e Redis

```bash
npm run dev:dependencies
```

ou

```bash
docker-compose up -d
```

### 4. Rode as migrations

```bash
npm run migrate:latest
```

Hoje existe uma migration inicial:

- `20260206193945_create_users_table.mjs`

Ela cria apenas a tabela `users`.

### 5. Rode as seeds

```bash
npm run seed:run
```

Hoje existe uma seed inicial:

- `20260327120000_seed_bootstrap_admin_user.mjs`

Ela cria ou atualiza um usuário admin de bootstrap com base nas variáveis:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_NAME`
- `SEED_ADMIN_PASSWORD`

Troque esses valores antes de rodar as seeds em ambientes compartilhados.

### 6. Inicie a aplicação

```bash
npm run start:dev
```

Observação sobre scripts:

- `npm run start:dev` executa migrations e inicia watch mode, assumindo dependências já disponíveis
- seeds continuam manuais via `npm run seed:run`

## Endpoints Disponíveis

### Público

- `POST /auth/login`

Body:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Comportamento atual:

- busca usuário por email
- compara senha com `bcrypt`
- retorna usuário sem senha
- pode retornar `token`, mas hoje ele vem vazio porque não há emissão implementada
- não marca a sessão como autenticada

### Protegidos por sessão

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

Essas rotas dependem do `AuthGuard`, que hoje espera:

```ts
request.session.authenticated === true
request.session.userId
```

Como o login ainda não popula esses campos, o fluxo completo de autenticação/autorização ainda precisa ser concluído.

## Documentação da API

- Scalar UI: `http://localhost:3000/docs`
- Swagger JSON: `http://localhost:3000/swagger/json`
- Swagger YAML: `http://localhost:3000/swagger/yaml`

## Padrões que a base já demonstra

### Resposta HTTP padronizada

As respostas seguem envelope neste formato:

```json
{
  "success": true,
  "data": {},
  "message": "Optional message",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "timestamp": "2026-03-26T00:00:00.000Z"
}
```

### Documentação com `@ApiDoc()`

O projeto possui um decorator customizado para reduzir boilerplate no Swagger e um mecanismo adicional que infere o schema real da resposta a partir do source code dos controllers.

### Sessions e contexto por request

- sessão Fastify persistida no Redis
- `AsyncLocalStorage` para compartilhar a sessão ao longo do request

## Comandos Úteis

```bash
# Criar novo módulo
npm run new:module -- orders
npm run new:module -- product-categories --entity product-category
npm run new:module -- reports --dry-run

# desenvolvimento
npm run start:dev

# build
npm run build

# lint
npm run lint

# testes
npm test
npm run test:watch
npm run test:cov
npm run test:e2e

# migrations
npm run migrate:latest
npm run migrate:rollback
npm run migrate:status

# seeds
npm run seed:run
npm run seed:rollback
npm run seed:status
npm run seed:make -- bootstrap_admin_user
```

### Gerar um novo módulo

O projeto agora inclui um gerador para criar a estrutura padrão completa de um módulo CRUD em `src/modules`, incluindo:

- `application/use-cases`
- `domain/entities`
- `domain/repositories`
- `infrastructure/persistence`
- `presentation/http/controllers`
- `presentation/http/dtos`

Por padrão, o script também registra o novo módulo em `src/app.module.ts`.

Flags úteis:

- `--entity <name>` para informar o nome singular da entidade
- `--no-register` para gerar os arquivos sem alterar os arquivos compartilhados
- `--force` para sobrescrever um módulo existente
- `--dry-run` para visualizar o que será criado antes de escrever

## Testes

O repositório contém hoje um teste unitário em:

- `src/config/swagger-response-inference.spec.ts`

Ele cobre a inferência de schemas para a documentação. Não há suíte e2e versionada neste momento.

## Limitações Conhecidas

- Sem JWT implementado
- Sem persistência de login na sessão
- Sem endpoint de registro/bootstrap público
- Sem exemplos reais de fila, cache aplicado em endpoint ou websocket gateway
- Variáveis de SMTP são obrigatórias mesmo sem fluxo de email exposto

## Próximos Passos Recomendados

1. Concluir a autenticação de fato: sessão ou JWT, mas de forma consistente
2. Endurecer a estratégia de bootstrap do admin seed para ambientes compartilhados
3. Expandir o padrão `Zod + use-cases + Knex` para os próximos módulos
4. Tornar email opcional no boot ou implementar a feature que justifique as variáveis obrigatórias
5. Adicionar testes e2e reais para `auth` e `users`
