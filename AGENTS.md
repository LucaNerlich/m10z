# AGENTS.md — M10Z Development Guidelines

Guidelines for AI agents working on the M10Z codebase.

## Project Overview

M10Z (Mindestens 10 Zeichen) is a German gaming/tech blog at m10z.de.
UI text is German; code and comments are English.

- **Frontend**: Next.js 16, React 19, TypeScript 5.9, CSS Modules (`frontend/`)
- **Backend**: Strapi 5 CMS, PostgreSQL (`backend/`)
- **Legacy**: Docusaurus 3 — retired, **do not modify** (`legacy/`)
- **Package manager**: pnpm 10. Node.js ^22. Each workspace is independent (no root pnpm-workspace).

## Build, Run & Verify Commands

### Frontend (`cd frontend`)

```bash
pnpm install                   # Install dependencies
pnpm run dev                   # Dev server on port 3000 (Turbopack)
pnpm run build                 # Production build
pnpm run start                 # Start production server
npx tsc --noEmit               # Typecheck (no script alias — run directly)
```

### Backend (`cd backend`)

```bash
pnpm install
pnpm run dev                   # Strapi dev server on port 1337
pnpm run build                 # Build Strapi admin panel
pnpm run start                 # Start production server
pnpm run migrate:audio         # Run audio migration script
```

### Tests

There are **no automated tests**. No ESLint or Biome linter is configured.
Before submitting any change:

1. `npx tsc --noEmit` in `frontend/` — must pass with zero errors
2. `pnpm run build` in `frontend/` — must succeed for code/config changes
3. Start the dev server to visually verify content/layout changes

---

## Code Style

### Formatting (Prettier — `.prettierrc`)

- 4-space indentation, single quotes, semicolons, LF line endings
- `bracketSpacing: false` → `{foo}` not `{ foo }`
- `jsxSingleQuote: true`, `trailingComma: "es5"`, `quoteProps: "consistent"`
- JSX closing bracket on same line as last prop (`jsxBracketSameLine: true`)
- Arrow parens always: `(x) =>` not `x =>`

### TypeScript

- Frontend: `strict: true`. Backend: `strict: false` (Strapi default).
- Prefer `type` over `interface` for props, unions, intersections, and simple types.
  Use `interface` only when inheritance (`extends`) is needed or for Strapi API contracts.
- Use inline `{type Foo}` for type-only imports: `import {type StrapiArticle} from '...'`.
- Use `===`/`!==` always — never `==`/`!=`.
- Handle `null`/`undefined` explicitly; avoid non-null assertions (`!`).

### Imports

Absolute imports via `@/src/...` (alias maps to `./frontend/*`).
Group order: External → Internal → Sibling components → Styles/Assets.

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

No relative `../` cross-directory imports in components — only `./` for siblings.

### Naming Conventions

| What              | Convention          | Example                    |
|-------------------|---------------------|----------------------------|
| Components/files  | PascalCase          | `ArticleCard.tsx`          |
| CSS Modules       | PascalCase          | `ContentCard.module.css`   |
| Library files     | camelCase           | `dateFormatters.ts`        |
| Props types       | PascalCase + Props  | `ArticleCardProps`         |
| Types             | PascalCase          | `StrapiArticle`            |
| Variables/funcs   | camelCase           | `getEffectiveDate`         |
| Hooks             | camelCase + `use`   | `useSearchQuery`           |
| Config constants  | SCREAMING_SNAKE     | `CACHE_REVALIDATE_DEFAULT` |

### React / Next.js Patterns

- **Server Components by default** — `'use client'` only when needed (search, theme, SWR, browser APIs).
- **React Compiler** is enabled (`reactCompiler: true` in `next.config.ts`) — manual memoization still allowed but compiler handles most cases.
- **CSS Modules** (`.module.css`) for component styles; CSS custom properties for theming (OKLCH). No Tailwind.
- **SWR** for client-side data fetching with a global provider.
- **`<Image>`** — always use Next.js `<Image>` for images.
- **Markdown**: `react-markdown` + rehype/remark plugins with custom components.
- **Named exports** for components (`export function ArticleCard`); **default exports** for pages (`export default async function Page`).
- **Conditional rendering**: use ternary `? ... : null`, not `&&`.

### Error Handling

- `try`/`catch` with `async`/`await` for all API calls.
- Strapi fetch functions must return fallback data if the CMS is unreachable.
- Never expose secrets or response bodies in error messages or logs.
- Use assertion functions (`assertIsLegalDoc`) for runtime type validation of API responses.
- Use `getErrorMessage(error: unknown)` from `src/lib/errors.ts` to safely extract error messages.

---

## Performance Rules (from `.cursor/rules/`)

Ranked by impact. Treat CRITICAL rules as mandatory.

1. **Async waterfalls** (CRITICAL) — Never use sequential awaits for independent operations. Use `Promise.all()`.
2. **Bundle size** (CRITICAL) — Avoid barrel-file imports (import directly from source paths). Use `optimizePackageImports` in `next.config.ts` for libraries like `@phosphor-icons/react`. Use dynamic `import()` for heavy/conditional code.
3. **Server-side** (HIGH) — Use `React.cache()` for per-request deduplication. Batch large slug arrays into chunks of 150.
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
- Rate-limit sensitive endpoints (cache invalidation, preview routes).
- CSP headers and Permissions-Policy are configured in `next.config.ts`.

---

## Architecture Notes

- **Data flow**: Strapi (PostgreSQL) → Next.js REST API fetches → Server-rendered pages with tag-based cache invalidation + time-based fallback.
- **Two fetch layers**: `src/lib/strapi.ts` (low-level with auth/caching) → `src/lib/strapiContent.ts` (domain functions wrapped in `React.cache()`).
- **Cache invalidation**: Strapi middleware POSTs to `/api/*/invalidate` → `revalidateTag()` + `revalidatePath()`.
- **Cache constants** (`src/lib/cache/constants.ts`): default 3600s, content pages 900s, search 3600s.
- **Tag naming**: `strapi:{type}`, `strapi:{type}:{slug}`, `feed:{type}`, `page:{name}`, `search-index`.
- **Routes are German**: `/artikel`, `/podcasts`, `/kategorien`, `/team`, `/impressum`, `/datenschutz`, `/ueber-uns`.
- **Preview routes**: `/preview/artikel/[slug]`, `/preview/podcasts/[slug]` — use `cache: 'no-store'`.
- **Connection pooling**: `undici` Agent as global fetch dispatcher via `instrumentation.ts`.
- **Path alias**: `@/*` maps to `./frontend/*` (e.g., `@/src/lib/strapi`).
- **Environment variables**: Frontend uses `.env.local`. Backend uses `.env`. See `.env.*.example` files. Never commit secrets.

---

## Submission Checklist

- [ ] `npx tsc --noEmit` passes (in `frontend/`)
- [ ] `pnpm run build` succeeds (in `frontend/`)
- [ ] No unrelated files added
- [ ] Code follows formatting and style conventions above
- [ ] No secrets or credentials committed
- [ ] Summary of changes provided
