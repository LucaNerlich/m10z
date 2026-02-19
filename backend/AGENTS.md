# AGENTS.md — M10Z Backend (Strapi 5)

Guidelines for AI agents working in the `backend/` workspace.
See also the root `../AGENTS.md` for full-project context.

## Project Overview

Strapi 5 headless CMS (v5.36.x) serving content to a Next.js frontend.
PostgreSQL database. Node.js ^22, pnpm 10, TypeScript 5.9.
UI text is German; code and comments are English.

## Build & Run Commands

```bash
pnpm install               # Install dependencies
pnpm run dev               # Strapi dev server on port 1337
pnpm run build             # Build Strapi admin panel
pnpm run start             # Start production server
pnpm run migrate:audio     # One-time audio file migration (tsx)
```

### Verification

There are **no automated tests, no linter, and no typecheck script**.
The backend uses `strict: false` in tsconfig and Strapi handles compilation.

Before submitting changes:
1. `pnpm run build` — must succeed
2. `pnpm run dev` — start the dev server and confirm no runtime errors
3. Verify cache invalidation reaches the frontend if middleware was changed

---

## Source Structure

```
src/
  index.ts                  # Register hook: middleware, blurhash schema, pool monitoring
  admin/                    # Strapi admin panel customization (separate tsconfig, strict: true)
  api/                      # Content types (Strapi convention: routes/controllers/services/content-types)
    article/                # Collection type — articles (draftAndPublish)
    podcast/                # Collection type — podcasts (draftAndPublish, audio files)
    author/                 # Collection type — authors
    category/               # Collection type — categories
    about/ about-feed/      # Single types — info pages
    article-feed/ audio-feed/ # Single types — RSS feed config
    imprint/ privacy/       # Single types — legal pages
    search-index/           # Single type — JSON search index blob
  components/               # Strapi reusable components (JSON schemas)
  cron/                     # Scheduled tasks (blurhash, wordcount, search index)
  middlewares/              # Document service middleware (cacheInvalidation, duration, wordCount)
  services/                 # Shared services (debounced queues, search index builder)
  utils/                    # Utilities (blurhash generation, Next.js cache invalidation)
  scripts/                  # One-off migration scripts
config/
  admin.ts                  # Admin panel, preview URLs, auth config
  api.ts                    # REST limits (default: 25, max: 100)
  database.ts               # PostgreSQL connection + pool config
  middlewares.ts             # Strapi middleware stack (security, CORS, body parser)
  plugins.ts                # Plugins (Mailgun email)
  server.ts                 # Server config, cron job schedule, HTTP timeouts
  sync/                     # strapi-plugin-config-sync JSON exports
types/generated/            # Auto-generated Strapi type definitions (do not edit)
```

---

## Code Style

### Formatting (Prettier — `.prettierrc`)

- 4-space indentation, single quotes, semicolons, LF line endings
- `bracketSpacing: false` → `{foo}` not `{ foo }`
- `jsxSingleQuote: true`, `trailingComma: "es5"`, `quoteProps: "consistent"`
- Arrow parens always: `(x) =>` not `x =>`

### TypeScript

- `strict: false` in the root tsconfig (Strapi default). Admin tsconfig uses `strict: true`.
- Prefer `type` over `interface` for simple types. Use `interface` for Strapi API contracts.
- Inline type-only imports: `import {type Foo} from '...'`.
- Use `===`/`!==` always — never `==`/`!=`.
- Handle `null`/`undefined` explicitly; avoid non-null assertions (`!`).

### Imports

- Relative imports throughout (no path aliases in backend server code).
- Deep relative paths are acceptable: `../../../../services/asyncCacheInvalidationQueue`.
- The admin panel (`src/admin/`) uses `@/` alias via Vite config.
- Group order: External packages → Internal modules.

### Naming Conventions

| What               | Convention       | Example                           |
|--------------------|------------------|-----------------------------------|
| Source files        | camelCase        | `cacheInvalidation.ts`            |
| Functions           | camelCase        | `queueCacheInvalidation`          |
| Types/Interfaces    | PascalCase       | `SearchRecord`, `InvalidateTarget`|
| Constants           | SCREAMING_SNAKE  | `MAX_RETRIES`, `DEBOUNCE_MS`      |
| Strapi UIDs         | Strapi convention| `api::article.article`            |

### Exports

- Named exports for functions: `export async function cacheInvalidationMiddleware(...)`.
- Default exports only where Strapi convention requires them (lifecycles, config, controllers).
- Type exports: `export type InvalidateTarget = ...`.

### Error Handling

- **Never throw from middleware** — catch errors and let the save operation proceed.
- `try/catch` around all async operations; log with `strapi.log.error()`.
- Failed operations log warnings but never block the main CRUD flow.
- Use `console.warn()`/`console.log()` only in utility functions where `strapi` is not available.
- Never expose secrets or full response bodies in logs.

### Async Patterns

- **Use `Promise.all()` for independent operations** (CRITICAL — see `.cursor/rules/`).
- Sequential processing with retry logic only where ordering matters (e.g., migrations).
- Debounced queues (5s) for cache invalidation and search index rebuilds.

### Security

- `crypto.timingSafeEqual()` for secret comparison (cache invalidation tokens).
- Path traversal protection: `resolve()` + `startsWith()` validation.
- SSRF protection: validate URL domains before fetching.
- Rate limiting: in-memory sliding window (30 req/min) on invalidation endpoints.
- Parameterized queries: `db.connection.raw('... WHERE x = ?', [value])`.
- API tokens are never logged. Secrets come from environment variables (`.env`).

### Documentation

- JSDoc on exported functions with `@param` and `@returns`.
- Block comments (`/** ... */`) at top of files explaining purpose.
- Inline comments for complex logic and security rationale.

---

## Architecture

### Middleware & Lifecycle Pipeline

Content mutation → Lifecycle hook (afterCreate/afterUpdate/afterDelete) + Document service middleware → `queueCacheInvalidation()` → 5s debounce → POST to `{FRONTEND_URL}/api/{target}/invalidate` with `x-m10z-invalidation-secret` header.

Three document service middlewares registered in `src/index.ts`:
1. **wordCount** — Before save: calculates word count from markdown/richtext.
2. **duration** — Before save: extracts audio duration from podcast files.
3. **cacheInvalidation** — After save: queues Next.js cache invalidation on publish/update.

### Cron Jobs (configured in `config/server.ts`)

| Time  | Task                          | Batch size |
|-------|-------------------------------|------------|
| 03:00 | Generate missing blurhashes   | 50 images  |
| 03:15 | Backfill word counts          | 50 + 50    |
| 03:30 | Rebuild search index          | Full       |

### Database

PostgreSQL with connection pool: min 2, max 25 (configurable via `DATABASE_POOL_*` env vars).
Pool monitoring logs acquisition/failure events and runs health checks every 60s in dev.

### HTTP Server Timeouts

- `keepAliveTimeout: 65s`, `headersTimeout: 66s`, `requestTimeout: 120s`

### Environment Variables

See `.env.example` for all variables. Key ones:
- `FRONTEND_URL` — target for cache invalidation POSTs
- `FEED_INVALIDATION_TOKEN` — shared secret for cache invalidation auth
- `DATABASE_*` — PostgreSQL connection config
- `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET` — Strapi secrets
- `MAILGUN_*` — email provider config

---

## Submission Checklist

- [ ] `pnpm run build` succeeds
- [ ] Dev server starts without errors (`pnpm run dev`)
- [ ] Code follows formatting and style conventions above
- [ ] No secrets or credentials committed
- [ ] `types/generated/` files are not manually edited
- [ ] Summary of changes provided
