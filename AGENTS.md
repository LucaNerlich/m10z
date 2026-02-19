# AGENTS.md - M10Z Development Guidelines

Guidelines for AI agents working on the M10Z codebase.

## Project Overview

M10Z (Mindestens 10 Zeichen) is a German gaming/tech blog at m10z.de.
UI text is German; code and comments are English.

- **Frontend**: Next.js 16, React 19, TypeScript, CSS Modules (`frontend/`)
- **Backend**: Strapi 5 CMS, PostgreSQL (`backend/`)
- **Legacy**: Docusaurus 3 — retired, do not modify (`legacy/`)
- **Package manager**: pnpm 10 (preferred). Node.js ^22.

## Build, Run & Verify Commands

### Frontend (`cd frontend`)

```bash
pnpm install              # Install dependencies
pnpm run dev              # Dev server on port 3000 (Turbopack)
pnpm run build            # Production build
pnpm run start            # Start production server
pnpm run typecheck        # tsc --noEmit (run BEFORE every submission)
```

### Backend (`cd backend`)

```bash
pnpm install
pnpm run dev              # Strapi dev server on port 1337
pnpm run build            # Build Strapi admin panel
pnpm run start            # Start production server
pnpm run migrate:audio    # Run audio migration script
```

### Tests

There are **no automated tests**. Before submitting any change:
1. `pnpm run typecheck` in `frontend/` — must pass
2. `pnpm run build` in `frontend/` — must succeed for code/config changes
3. Start the dev server to visually verify content changes

---

## Code Style

### Formatting (Prettier — `.prettierrc`)

- 4-space indentation, single quotes, semicolons, LF line endings
- `bracketSpacing: false`, `jsxSingleQuote: true`, `trailingComma: "es5"`
- No bracket spacing: `{foo}` not `{ foo }`

### TypeScript

- Frontend: `strict: true`. Backend: `strict: false` (Strapi default).
- Prefer `type` over `interface` for props, unions, intersections, and simple types.
- Use `import type {Foo}` for type-only imports.
- Use `===`/`!==` always — never `==`/`!=`.

### Imports

Use absolute imports via `@/src/...`. Group order: External → Internal → Components → Styles/Assets.

```typescript
import Image from 'next/image';
import Link from 'next/link';
import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {routes} from '@/src/lib/routes';
import {AuthorList} from './AuthorList';
import styles from './Component.module.css';
import placeholderCover from '@/public/images/m10z.jpg';
```

### Naming Conventions

| What              | Convention          | Example                  |
|-------------------|---------------------|--------------------------|
| Components/files  | PascalCase          | `ArticleCard.tsx`        |
| Props types       | PascalCase + Props  | `ArticleCardProps`       |
| Variables/funcs   | camelCase           | `getEffectiveDate`       |
| Config constants  | SCREAMING_SNAKE     | `CACHE_REVALIDATE_DEFAULT` |
| Types             | PascalCase          | `StrapiArticle`          |

### React / Next.js Patterns

- **Server Components by default** — `'use client'` only when needed (search, theme, SWR).
- **React Compiler** is enabled (`reactCompiler: true` in `next.config.ts`).
- **CSS Modules** (`.module.css`) for component styles, CSS custom properties for theming (OKLCH). No Tailwind.
- **SWR** for client-side data fetching with a global provider.
- **`<Image>`** — always use Next.js `<Image>` for images.
- **Markdown**: `react-markdown` + rehype/remark plugins with custom components.

### Error Handling

- try/catch with async/await for all API calls.
- Strapi fetch functions must return fallback data if the CMS is unreachable.
- Handle null/undefined explicitly; avoid non-null assertions.
- Never expose secrets or sensitive data in error messages or logs.

---

## Performance Rules (from `.cursor/rules/`)

These are ranked by impact. Treat CRITICAL rules as mandatory.

1. **Async waterfalls** (CRITICAL) — Never use sequential awaits for independent operations. Use `Promise.all()`.
2. **Bundle size** (CRITICAL) — Avoid barrel-file imports (import directly from source paths). Use `optimizePackageImports` in `next.config.ts` for libraries like `@phosphor-icons/react`. Use dynamic `import()` for heavy/conditional code.
3. **Server-side** (HIGH) — Use `React.cache()` for deduplication. Batch large slug arrays into chunks of 150.
4. **Client data** (MEDIUM-HIGH) — Leverage SWR deduplication; avoid redundant fetches.
5. **Re-renders** (MEDIUM) — Use `useMemo`, `useCallback`, `React.memo` where appropriate.

---

## Security Rules (from `.cursor/rules/security-*`)

- **Never** use raw user input in file paths, commands, or database queries.
- **Never** hardcode secrets — use environment variables (`.env.local` for frontend, `.env` for backend).
- **Never** use `eval()`, `new Function()`, or `vm` with dynamic input.
- Use constant-time comparison for secrets (e.g., `timingSafeEqual`).
- Validate and sanitize all external input. Use DOMPurify for user-generated HTML.
- Use HTTPS for all external communication.
- Use `===`/`!==` exclusively to prevent type coercion.
- Rate-limit sensitive endpoints (cache invalidation, preview routes).
- CSP headers and Permissions-Policy are configured in `next.config.ts`.

---

## Architecture Notes

- **Data flow**: Strapi (PostgreSQL) → Next.js REST API fetches → Server-rendered pages with tag-based cache invalidation + time-based fallback.
- **Cache invalidation**: Strapi middleware POSTs to `/api/*/invalidate` → `revalidateTag()` + `revalidatePath()`.
- **Cache constants** (`src/lib/cache/constants.ts`): default 3600s, content pages 900s, search 3600s.
- **Tag naming**: `strapi:{type}`, `strapi:{type}:{slug}`, `feed:{type}`, `page:{name}`, `search-index`.
- **Routes are German**: `/artikel`, `/podcasts`, `/kategorien`, `/team`, `/impressum`, `/datenschutz`, `/ueber-uns`.
- **Preview routes**: `/preview/artikel/[slug]`, `/preview/podcasts/[slug]` — use `cache: 'no-store'`.
- **Connection pooling**: `undici` Agent as global fetch dispatcher via `instrumentation.ts`.
- **Path alias**: `@/*` maps to `./frontend/*` (e.g., `@/src/lib/strapi`).
- **Environment variables**: Frontend uses `.env.local` (`STRAPI_URL`, `STRAPI_PREVIEW_SECRET`, `NEXT_PUBLIC_BASE_URL`). Backend uses `.env` (see `backend/.env.example`). Never commit secrets.

---

## Submission Checklist

- [ ] `pnpm run typecheck` passes (in `frontend/`)
- [ ] `pnpm run build` succeeds (in `frontend/`)
- [ ] No unrelated files added
- [ ] Code follows formatting and style conventions
- [ ] No secrets or credentials committed
- [ ] Summary of changes provided
