# AGENTS.md — M10Z Frontend

Next.js 16 / React 19 / TypeScript 5.9 frontend for m10z.de (German gaming/tech blog).
UI text is German; code and comments are English. See also: root `../AGENTS.md`.

## Build & Verify Commands

```bash
pnpm install                   # Install dependencies (pnpm 10, Node ^22)
pnpm run dev                   # Dev server on :3000 (Turbopack)
pnpm run build                 # Production build — MUST succeed before submitting
npx tsc --noEmit               # Typecheck — MUST pass with zero errors
```

There are **no automated tests** and no linter (no ESLint, no Biome).
Always run `npx tsc --noEmit` and `pnpm run build` to verify changes.

## Code Style

### Formatting (Prettier — `.prettierrc`)

- 4-space indentation, single quotes, semicolons, LF line endings
- `bracketSpacing: false` → `{foo}` not `{ foo }`
- `jsxSingleQuote: true`, `trailingComma: "es5"`, `quoteProps: "consistent"`
- JSX closing bracket on same line as last prop (`jsxBracketSameLine: true`)
- Arrow parens always: `(x) =>` not `x =>`

### TypeScript

- `strict: true` — all strict checks are enforced.
- Prefer `type` over `interface`. Use `interface` only for inheritance (`extends`).
- Type-only imports inline: `import {type StrapiArticle} from '...'`.
- Strict equality only (`===`/`!==`), never `==`/`!=`.
- Handle `null`/`undefined` explicitly; avoid non-null assertions (`!`).

### Imports

Path alias `@/*` maps to `./frontend/*`. Use `@/src/...` for absolute imports.
Group order: External → Internal (`@/src/...`) → Siblings (`./`) → Styles/Assets.

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

## React / Next.js Patterns

- **Server Components by default** — add `'use client'` only when needed.
- **React Compiler** is enabled (`reactCompiler: true`) — manual memoization is allowed but usually unnecessary.
- **CSS Modules** (`.module.css`) for styling; CSS custom properties (OKLCH) for theming. No Tailwind.
- **SWR** for client-side data fetching with a global provider.
- **`<Image>`** — always use `next/image` for images.
- **Markdown**: `react-markdown` + rehype/remark plugins with custom components.
- **Named exports** for components; **default exports** for pages only.
- **Conditional rendering**: use ternary `? ... : null`, not `&&`.

## Error Handling

- `try`/`catch` with `async`/`await` for all API calls.
- Strapi fetch functions must return fallback data if the CMS is unreachable.
- Never expose secrets or response bodies in error messages or logs.
- Use assertion functions (e.g., `assertIsLegalDoc`) for runtime type validation of API data.
- Use `getErrorMessage(error: unknown)` from `src/lib/errors.ts` for safe error message extraction.

## Performance Rules (from `.cursor/rules/`)

Ranked by impact. CRITICAL rules are mandatory.

1. **Async waterfalls** (CRITICAL) — Never sequential awaits for independent ops. Use `Promise.all()`.
2. **Bundle size** (CRITICAL) — No barrel-file imports; import directly from source. Use `optimizePackageImports` in `next.config.ts` (configured for `@phosphor-icons/react`). Dynamic `import()` for heavy/conditional code.
3. **Server-side** (HIGH) — `React.cache()` for per-request deduplication. Batch large slug arrays into chunks of 150.
4. **Client data** (MEDIUM-HIGH) — Leverage SWR deduplication; avoid redundant fetches.
5. **Re-renders** (MEDIUM) — `useMemo`, `useCallback`, `React.memo` where appropriate.
6. **Rendering** (MEDIUM) — Hoist static JSX outside components. Use `content-visibility: auto` for long lists.

## Security

- Never use raw user input in file paths, commands, or database queries.
- Never hardcode secrets — use `.env.local` (never committed).
- Never use `eval()`, `new Function()`, or `vm` with dynamic input.
- Validate and sanitize all external input. Use DOMPurify for user-generated HTML.
- HTTPS for all external communication.
- CSP headers and Permissions-Policy are configured in `next.config.ts`.
- Rate-limit sensitive endpoints (cache invalidation, preview routes).

## Architecture

- **Data flow**: Strapi (PostgreSQL) → Next.js REST API fetches → Server-rendered pages with tag-based cache + time-based fallback.
- **Fetch layers**: `src/lib/strapi.ts` (low-level with auth/caching) → `src/lib/strapiContent.ts` (domain functions wrapped in `React.cache()`).
- **Cache invalidation**: Strapi middleware POSTs to `/api/*/invalidate` → `revalidateTag()` + `revalidatePath()`.
- **Cache constants** (`src/lib/cache/constants.ts`): default 3600s, content pages 900s, search 3600s.
- **Tag naming**: `strapi:{type}`, `strapi:{type}:{slug}`, `feed:{type}`, `page:{name}`, `search-index`.
- **Routes are German**: `/artikel`, `/podcasts`, `/kategorien`, `/team`, `/impressum`, `/datenschutz`, `/ueber-uns`. See `src/lib/routes.ts`.
- **Preview routes**: `/preview/artikel/[slug]`, `/preview/podcasts/[slug]` — use `cache: 'no-store'`.
- **Connection pooling**: `undici` Agent as global fetch dispatcher via `instrumentation.ts`.
- **Environment variables**: `.env.local` (see `.env.local.example`). Never commit secrets.

## Cursor Rules Reference

58 rules exist in `../.cursor/rules/`. Key categories:

- **`async-*.md`** (5 rules) — Parallel fetching, Suspense boundaries, deferred awaits.
- **`bundle-*.md`** (5 rules) — Tree-shaking, dynamic imports, preloading, conditional loading.
- **`server-*.md`** (4 rules) — React.cache, LRU caching, serialization, parallel fetching.
- **`client-*.md`** (2 rules) — SWR dedup, shared event listeners.
- **`rerender-*.md`** (6 rules) — Memoization, transitions, lazy state, derived state.
- **`rendering-*.md`** (5 rules) — Conditional render, content-visibility, SVG, hoisted JSX.
- **`js-*.md`** (8 rules) — RegExp hoisting, Set/Map lookups, early exit, caching.
- **`security-*.mdc`** (20 rules) — Base security (always applied), auth, API, input validation, injection prevention, path traversal, SSRF, data protection, language-specific (Node.js).

Only `security-global-base.mdc` has `alwaysApply: true`; others activate contextually.

## Submission Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm run build` succeeds
- [ ] No unrelated files added
- [ ] Code follows formatting and style conventions
- [ ] No secrets or credentials committed
