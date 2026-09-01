# NestJS API Scaffold

Base para APIs REST com NestJS, Fastify, PostgreSQL e Redis, organizada em módulos `feature-first`.

Este README foi ajustado para refletir o estado real do projeto hoje. A base já oferece bootstrap sólido de infraestrutura, documentação automática e exemplos de `auth` e `users`, mas ainda não fecha todos os fluxos de produto prometidos pela documentação antiga.

## Estado Atual

### O que já existe

- Bootstrap com `NestJS + Fastify`
- PostgreSQL com `Drizzle ORM + pg` e `better-auth`
- Redis conectado para `session`, `cache`, `Bull` e adapter de `socket.io`
- Módulo `auth` com `POST /auth/login` e `POST /auth/google`
- Módulo `users` com CRUD via `use-cases + Drizzle`
- Swagger JSON/YAML e interface Scalar em `/docs`
- Inferência automática de envelopes de resposta para a documentação
- Bootstrap interativo para nome, infra prefixada, Google Auth, SMTP e seed inicial

### O que ainda está incompleto

- O login por email/senha e Google já grava a sessão, mas a base **ainda não emite JWT**
- O `AuthGuard` exige `request.session.authenticated` e `request.session.userId` para rotas protegidas
- O fluxo de autenticação por sessão já existe, mas ainda faltam camadas como refresh token, linking/desvinculação de provedores e UX de frontend
- A validação HTTP está padronizada com `Zod`
- O envio de email pode ser desligado via `EMAIL_ENABLED`, mas a base ainda não traz uma interface pública de administração dessas notificações
- `cache`, `queue` e `websocket` estão ligados na infraestrutura, mas não há exemplos de rota com cache, processor do Bull ou gateway socket implementados
- Existe script `test:e2e`, mas não há pasta `test/` no repositório neste momento

### Status da documentação auxiliar

Arquivos como `QUICK_START.md`, `AUTH_EXAMPLE.md` e `ZOD_MIGRATION_GUIDE.md` descrevem uma visão mais otimista da base do que o código realmente entrega hoje. Até eles serem alinhados, trate este `README.md` como a referência principal.

## Stack

- `NestJS 11`
- `Fastify`
- `Drizzle ORM` + `drizzle-kit`
- `pg`
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
  - expõe `POST /auth/login` e `POST /auth/google`
  - usa `LoginUseCase`
  - valida request com `Zod`
  - compara senha com `bcrypt`
- `users`
  - expõe CRUD HTTP
  - usa `Zod` + `use-cases` explícitos
  - persiste `User` com `Drizzle` (`pgTable` + `drizzle-orm`)
  - usa `drizzle-orm/pg-core` com RLS via `DatabaseService.withRlsContext`
- `shared/infrastructure`
  - centraliza banco, cache, fila e session storage

## Setup

### 0. Personalize o template

```bash
pnpm bootstrap
```

O script de bootstrap pergunta o nome do projeto, o nome do pacote npm e a descrição da aplicação. Também permite habilitar Google Auth, ligar/desligar envio de email, prefixar a infraestrutura pelo nome do projeto e configurar o admin/organização iniciais. Depois ele atualiza `package.json`, `pnpm-lock.yaml` quando existir, `README.md`, `QUICK_START.md` e as variáveis relevantes em `.env` e `.env.example`.
### 1. Instale dependências

```bash
pnpm install
```

### 2. Configure ambiente

```bash
cp .env.example .env
```

O arquivo `.env.example` já contém os valores locais esperados para PostgreSQL e Redis. O bootstrap também prepara as principais flags de autenticação, email e seed:

 - `APP_SLUG`
 - `SESSION_SECRET` (legado, substituído por `BETTER_AUTH_SECRET` mas mantido como shim)
 - `BETTER_AUTH_SECRET` (min 32 chars, obrigatório)
 - `BETTER_AUTH_URL` (URL base do Better Auth, ex: `http://localhost:3000`)
 - `EMAIL_ENABLED`
 - `SMTP_HOST`
 - `SMTP_USER`
 - `SMTP_PASS`
 - `APP_URL`
 - `API_URL`
 - `GOOGLE_AUTH_ENABLED`
 - `GOOGLE_CLIENT_ID`
 - `GOOGLE_CLIENT_SECRET`

### 3. Suba PostgreSQL e Redis

```bash
pnpm dev:dependencies
```

ou

```bash
docker-compose up -d
```

### 4. Rode as migrations

```bash
pnpm db:migrate
```

Hoje a base já traz migrations para `users`, `auth`, `organizations`, `permissions` e `reports`, executadas via `drizzle-kit` e SQL em `src/shared/infrastructure/database/migrations/*` (`0000_equal_sunspot.sql` + `0001_enable_rls.sql`).

### 5. Rode as seeds

```bash
pnpm seed:run
```

Hoje a base já traz seeds para bootstrap do admin e catálogo inicial de permissões.

A seed de bootstrap cria ou atualiza um usuário admin e pode criar uma organização inicial com base nas variáveis:

- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_NAME`
- `SEED_ADMIN_PASSWORD`
- `SEED_ORGANIZATION_NAME`

Troque esses valores antes de rodar as seeds em ambientes compartilhados.

### 6. Inicie a aplicação

```bash
pnpm start:dev
```

Observação sobre scripts:

- `pnpm start:dev` executa `pnpm db:migrate` e inicia watch mode, assumindo dependências já disponíveis
- seeds continuam manuais via `pnpm seed:run`

## Endpoints Disponíveis

### Público

- `POST /auth/login`
- `POST /auth/google`

Body para `POST /auth/login`:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Comportamento atual:

- busca usuário por email
- compara senha com `bcrypt`
- grava a sessão autenticada
- retorna usuário sem senha

Para Google Auth:

- o backend recebe um `id_token` do Google
- valida o token contra o `GOOGLE_CLIENT_ID`
- cria ou vincula o usuário local pelo email/`google_id`
- grava a sessão autenticada

Body para `POST /auth/google`:

```json
{
  "idToken": "google-id-token"
}
```

### Protegidos por sessão

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

Essas rotas dependem do `AuthGuard`, que espera:

```ts
request.session.authenticated === true
request.session.userId
```

Os logins por email/senha e Google já populam esses campos.

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

- Better Auth (`auth` schema: `user`, `session`, `account`, `verification` via `drizzleAdapter`) — `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` + `GOOGLE_CLIENT_ID`/`SECRET` + `CORS_ORIGIN` como `trustedOrigins`; `emailAndPassword` habilitado, handler montado em `/api/auth/*`
- `BetterAuthGuard` (global `APP_GUARD` após `ThrottlerGuard`) valida sessão via `auth.api.getSession` e anexa `request.user`/`request.session`; `TenantMiddleware` e `PermissionsGuard` lêem contexto do Better Auth + header `x-organization-id`
- Redis mantido para `cache`, `Bull` e `Socket.IO` (não mais para sessão)
- `AsyncLocalStorage` para compartilhar sessão + tenant ao longo do request (RLS `SET LOCAL` via `SessionStorageInterceptor`)

> Placeholders: docs de fluxo completo de `password-reset`/`email-verification` via Better Auth e exemplos de `account` linking ainda serão expandidos. O lane de DB criará as tabelas `auth.*` via migrations; o lane de auth apenas consome o `DRIZZLE` existente (não recria `Pool`).

## Comandos Úteis

```bash
# Criar novo módulo
pnpm new:module -- orders
pnpm new:module -- product-categories --entity product-category
pnpm new:module -- reports --dry-run

# desenvolvimento
pnpm start:dev

# build
pnpm build

# lint
pnpm lint

# testes
pnpm test
pnpm test:watch
pnpm test:cov
pnpm test:e2e

# migrations (drizzle-kit)
pnpm db:generate
pnpm db:migrate
pnpm db:check
# seeds
pnpm seed:run
pnpm seed:status
pnpm seed:make -- bootstrap_admin_user
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
