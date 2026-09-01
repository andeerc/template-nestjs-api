# AGENTS.md — template-nestjs-api

> NestJS 11 + Fastify + Drizzle ORM + PostgreSQL 17 + Redis 7 + Better Auth + Biome + pnpm 10

## Quick start

```bash
pnpm install           # --frozen-lockfile in CI
pnpm dev:dependencies  # docker-compose up -d (postgres + redis)
pnpm db:migrate        # drizzle-kit migrate (0000..0003)
pnpm seed:run          # bootstrap admin + permissions catalog
pnpm start:dev         # pnpm db:migrate && nest start --watch
```

Other: `pnpm build` → `dist/main.js`, `pnpm lint` (`biome check .`), `pnpm test` (`vitest run`), `pnpm db:studio`, `pnpm db:check`.

Env: `cp .env.example .env` → `DATABASE_URL` preferred; fallback `DB_HOST/PORT/NAME/USER/PASSWORD`, `BETTER_AUTH_SECRET` ≥32 chars, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`, `APP_SLUG` prefixes docker names.

## Stack & toolchain

- **Runtime:** Node ≥24 (engines), `packageManager: pnpm@10.0.0`, Fastify + `@fastify/*`, `pg` Pool min2/max10 SSL prod+DB_SSL.
- **Lint/format:** Biome 2.3.8 replaces eslint+prettier. Config `biome.json` (tab 2, 80, semicolons, `parser.unsafeParameterDecoratorsEnabled:true`, `linter.suspicious.noThenProperty:off` for Joi). VSCode `biomejs.biome` default formatter, `organizeImports onSave`. Scripts: `lint`/`lint:fix`/`format` → `biome check`.
- **Build:** `nest build`, `tsconfig.json` `module:nodenext` + `paths @/* → src/*`, `tsconfig.build.json` excludes `vitest.config.*`/`src/vitest.config.ts`.
- **Docker:** `Dockerfile` node:24-alpine multi-stage, `corepack enable && corepack prepare pnpm@10 --activate`, `pnpm install --frozen-lockfile` + `pnpm build`. Compose: `postgres:17.6-alpine` + `redis:7-alpine`.
- **CI:** `.github/workflows/lint.yml` + `unit-test.yml` use `pnpm/action-setup@v4` v10 + `setup-node` cache `pnpm` + `pnpm install --frozen-lockfile` + `pnpm build` + `pnpm lint/test`, Node 24, `concurrency cancel-in-progress`.

## Architecture

```
src/
├── core/auth/           # better-auth instance (drizzleAdapter) + BetterAuthGuard (APP_GUARD)
├── config/              # env.validation (Joi), env.config, app.config (Fastify, CORS, CSP, /api/auth/* catch-all, Swagger+Scalar), session.config (deprecated shim)
├── modules/
│   ├── users/           # CRUD + use-cases + drizzle repo (withRlsContext)
│   ├── organizations/   # + memberships
│   ├── permissions/     # RBAC (Casl) + organization_user_permissions
│   ├── reports/         # exporters
│   ├── emails/          # queue (Bull) + senders
│   └── ws/              # socket.io + redis adapter
├── shared/
│   ├── context/         # AppSessionContext, getSessionFromContext
│   ├── http/            # decorators (@Public, @CurrentUser), guards (BetterAuth, Permissions), interceptors (SessionStorage, HttpCache), filters
│   ├── ids/             # snowflakeId (varchar 24)
│   ├── infrastructure/
│   │   ├── database/    # DatabaseService (Pool+drizzle), schemas, migrations, rls, seeds
│   │   ├── cache/ queue/ websocket/
│   │   └── auth/        # better-auth re-export
│   └── session-storage/ # AsyncLocalStorage
├── types/               # fastify/socket.io augments
├── app.module.ts        # SharedInfrastructureModule + Throttler + BetterAuthGuard + PermissionsGuard + SessionStorageInterceptor + TenantMiddleware(*)
└── main.ts
```

- Feature-first: each `modules/<name>` → `domain/entities`, `domain/repositories/*.interface`, `infrastructure/persistence/repositories`, `application/use-cases`, `presentation/http/controllers+dto`.
- No `src/modules/auth/` — auth entirely via `better-auth` (`src/core/auth/better-auth.ts` + `/api/auth/*`). `GET /auth/me` removed; use `GET /api/auth/get-session` or `auth.api.getSession`. Password reset via better-auth `requestPasswordReset`/`resetPassword` (verification table), not `password_reset_tokens` (dropped in 0003).
- `src/types/` and `src/vitest.config.ts` are project-local; root `vitest.config.ts` delegates.

## Database — Drizzle + RLS

- **Config:** `drizzle.config.ts` `dialect:postgresql`, `schema: [schemas/*, schemas/auth/*]`, `out: migrations`, `verbose/strict true`. `scripts/database/shared-config.mjs` centralizes `createPgPoolConfig` / `createDatabaseUrl` / `ensureDatabaseUrl` / `listAppliedMigrations(__drizzle_migrations)` and injects `DATABASE_URL` when missing.
- **Schemas:** `pgTable` + `varchar(24)` snowflake PKs, `timestamp` etc, `pgSchema("auth")` for `auth.user/session/account/verification` (better-auth). Public tables: `users`, `organizations`, `organization_memberships`, `permissions`, `roles`, `organization_report_settings`, etc.
- **Migrations:** `0000_equal_sunspot.sql` (DDL 11 tables incl. password_reset_tokens historically) + `0001_enable_rls.sql` (ENABLE+FORCE RLS 5 tables + 5 policies `current_setting(app.current_organization_id, true)='' OR ...`) + `0002_careless_king_cobra.sql` (CREATE SCHEMA auth + 4 better-auth tables) + `0003_worthless_stature.sql` (DROP TABLE password_reset_tokens CASCADE). Meta in `migrations/meta/{_journal.json,*.snapshot.json}`.
- **RLS:** `DatabaseService.withRlsContext({userId,organizationId,role}, tx=> set_config x4 in transaction)`; repos distinguish privileged `db` vs RLS `tx`. `TenantMiddleware` reads `x-tenant-id`/`x-organization-id`. `SessionStorageInterceptor` merges `session`+`tenant` into `AsyncLocalStorage`.
- **Seeds:** `seeds/{index.ts,run-seed.ts,seed-bootstrap-admin.ts,seed-permissions-catalog.ts}` (replaces old `.mjs`). Backups in `migrations/_objx_backup/` + `seeds/_objx_backup/` are **gitignored** reference only — do not commit `_objx_backup` or `node_modules/dist`.
- **Scripts:** `migrate:make`→`drizzle-kit generate`, `migrate:latest`→`migrate`, `migrate:status`→`check`+`__drizzle_migrations` query, `db:*` wrappers around `drizzle-kit`.

## Auth — Better Auth

- **Instance:** `src/core/auth/better-auth.ts` `drizzle(pool)+drizzleAdapter(pg)`, `secret/baseURL/trustedOrigins` from `envConfig`, `emailAndPassword.enabled:true` + `sendResetPassword: log+TODO EmailQueue`, `socialProviders.google` conditional, `cookieCache 5min`, `generateId:false`, `databaseHooks.user.create.after` syncs `usersTable` (snowflake 24).
- **Guard:** `src/core/auth/better-auth.guard.ts` global `APP_GUARD`, checks `IS_PUBLIC_KEY`, WS allows `client.data.session` else `WsException`, HTTP builds `Headers` from `request.headers` → `auth.api.getSession`, injects `request.user`/`request.session`.
- **Controller shim:** previously `src/modules/auth` deleted; remaining catch-all route `/api/auth/*` in `app.config.ts` builds `Fetch Request` and delegates to `auth.handler`.
- **Session/WS:** `execution-context-session.util.ts` + `session.storage.interceptor.ts` (`storage.run`) + `ws-adapter.ts` (`SessionIoAdapter.attachSession` → `auth.api.getSession`).
- **Env:** `BETTER_AUTH_SECRET min32`, `BETTER_AUTH_URL uri`, `DATABASE_URL optional`, `GOOGLE_CLIENT_SECRET optional` in `env.validation.ts` (`noThenProperty` disabled for Joi).

## Code generation

- `pnpm new:module -- <kebab-plural> [--entity <singular>] [--dry-run]` → drizzle-based repo (`DRIZZLE` + `eq/and/count` + `pgTable`) and `pgTable` model (`id varchar 24`, `name text`, timestamps). Old Objx `defineModel` templates removed.

## Conventions for agents

- Always `pnpm`, never `npm`/`yarn`. Use `corepack`. Do not reintroduce `package-lock.json`/`eslint`/`prettier`/`@qbobjx/*` (deleted). `pnpm-lock.yaml` v9 `autoInstallPeers true`.
- Run `pnpm install && pnpm biome check . --diagnostic-level=error && pnpm build && pnpm vitest run` before push; `pnpm drizzle-kit check` should be clean.
- Do not edit `migrations/*.sql` or `meta/*.json` manually — use `drizzle-kit generate`. Keep `_objx_backup` gitignored.
- Keep `better-auth` lane separate from `public` RLS lane — `users` sync via hook only.
- Prefer `DRIZZLE` + `withRlsContext` in repos; avoid raw `pg` outside `DatabaseService`.
