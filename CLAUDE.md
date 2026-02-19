# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

M10Z (Mindestens 10 Zeichen) is a German gaming and technology blog at m10z.de. The UI text is in German; code and comments are in English.

**Monorepo structure:**
- `frontend/` — Next.js 16 + React 19 + TypeScript (the active website)
- `backend/` — Strapi 5 CMS + PostgreSQL (headless CMS)
- `legacy/` — Docusaurus 3 (retired, retained in repo)

**Package manager:** pnpm (v10). Node.js ^22.

## Build & Dev Commands

### Frontend (`cd frontend`)

```bash
pnpm install             # Install dependencies
pnpm run dev             # Dev server on port 3000 (Turbopack)
pnpm run build           # Production build
pnpm run start           # Start production server
pnpm run typecheck       # TypeScript type check (tsc --noEmit)
```

### Backend (`cd backend`)

```bash
pnpm install             # Install dependencies
pnpm run dev             # Strapi dev server on port 1337
pnpm run build           # Build Strapi admin panel
pnpm run start           # Start production server
pnpm run migrate:audio   # Run audio migration script
```

### Verification

There are no automated tests. Before submitting changes:
- Run `pnpm run typecheck` in `frontend/`
- Run `pnpm run build` in `frontend/` for code/config changes

## Architecture

### Data Flow

Strapi CMS (PostgreSQL) → Next.js frontend fetches via Strapi REST API → Server-rendered pages with two-tier caching (tag-based invalidation + time-based fallback).

When content is published/updated in Strapi, a backend middleware sends authenticated POST requests to frontend `/api/*/invalidate` endpoints, which call `revalidateTag()` and `revalidatePath()` to bust the Next.js cache.

### Frontend Architecture

- **App Router** exclusively (no Pages Router). All routes are German paths (`/artikel`, `/podcasts`, `/kategorien`, `/team`, `/impressum`, `/datenschutz`, `/ueber-uns`).
- **Server Components by default** — `'use client'` only where necessary (search modal, theme selector, SWR provider).
- **React Compiler** is enabled (`reactCompiler: true` in `next.config.ts`).
- **Two data-fetching layers**: `src/lib/strapi.ts` (low-level fetch with auth/caching) and `src/lib/strapiContent.ts` (high-level content functions wrapped in `React.cache()`).
- **Query building**: `qs` library constructs Strapi query strings with populate/filter/pagination params.
- **Client-side data**: SWR with a global provider, used for search functionality (`useSearchQuery` hook).
- **Styling**: CSS Modules (`.module.css`) per component, CSS custom properties for theming (OKLCH colors), multiple themes (light/dark/night/paper/hacker/rainbow/oled). No Tailwind.
- **Markdown rendering**: `react-markdown` + rehype/remark plugins, with custom components for code blocks (Prism), images (Fancybox lightbox), and Mermaid diagrams.
- **Connection pooling**: `undici` Agent set as global fetch dispatcher via `instrumentation.ts`.
- **Path alias**: `@/*` maps to `./frontend/*` (e.g., `@/src/lib/strapi`).

### Backend Architecture

- Strapi 5 with content types: `article`, `podcast`, `author`, `category`, plus single types for pages (`about`, `imprint`, `privacy`, feed configs).
- Custom middlewares: `cacheInvalidation.ts` (triggers frontend cache busting), `duration.ts`, `wordCount.ts`.
- Cron jobs: nightly blurhash generation, word count calculation, search index rebuild.
- Lifecycle hooks on content types handle post-publish invalidation queuing.

### Cache Strategy

Cache constants are in `src/lib/cache/constants.ts`:
- `CACHE_REVALIDATE_DEFAULT` = 3600s (lists, feeds, static pages)
- `CACHE_REVALIDATE_CONTENT_PAGE` = 900s (detail pages)
- `CACHE_REVALIDATE_SEARCH` = 3600s (search index)

Tag naming: `strapi:{type}`, `strapi:{type}:{slug}`, `feed:{type}`, `page:{name}`, `search-index`. See `frontend/CACHING.md` for full details.

## Code Style

### Formatting (Prettier)

4-space indentation, single quotes, semicolons, `bracketSpacing: false`, `jsxSingleQuote: true`, `trailingComma: "es5"`, LF line endings. See `.prettierrc`.

### TypeScript

- Frontend: `strict: true`. Backend: `strict: false` (Strapi default).
- Prefer `type` over `interface` for props and simple types.
- Use `import type {Foo}` for type-only imports.

### Imports

Absolute imports via `@/src/...`. Group order: External → Internal → Components → Styles.

```typescript
import Image from 'next/image';
import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {routes} from '@/src/lib/routes';
import styles from './Component.module.css';
```

### Naming

- Components/files: PascalCase (`ArticleCard.tsx`)
- Variables/functions: camelCase
- Config constants: SCREAMING_SNAKE_CASE
- Props types: `ComponentNameProps`

### Key Patterns

- Avoid sequential awaits — use `Promise.all()` for parallel fetching.
- All Strapi fetch functions return fallback data if the CMS is unreachable.
- Large slug arrays are batched into chunks of 150.
- Security: constant-time secret comparison, rate limiting on invalidation endpoints, CSP headers, DOMPurify for user content.
- Preview routes (`/preview/artikel/[slug]`, `/preview/podcasts/[slug]`) use `cache: 'no-store'`.
