# AGENTS.md - M10Z Development Guidelines

This document provides guidelines for AI agents working on the M10Z codebase.

## Project Overview

M10Z (Mindestens 10 Zeichen) is a German gaming and technology blog built with:
- **Frontend**: Next.js 16, React 19, TypeScript, CSS Modules
- **Backend**: Strapi CMS (Node.js), PostgreSQL
- **Package Manager**: pnpm (preferred) or npm 11+

## Project Structure

```
m10z/
├── frontend/          # Next.js 16 application
│   ├── src/
│   │   ├── app/       # Next.js App Router pages and API routes
│   │   ├── components/# React components
│   │   └── lib/       # Utilities, types, API clients
│   └── package.json
├── backend/           # Strapi CMS
│   ├── src/
│   │   ├── api/      # Strapi API definitions
│   │   └── plugins/  # Custom plugins
│   └── package.json
├── load-test/         # Load testing scripts
└── legacy/           # Legacy Docusaurus site
```

---

## Build, Run & Test Commands

### Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Development
pnpm run dev          # Start Next.js dev server on port 3000

# Build
pnpm run build        # Production build
pnpm run start        # Start production server

# Type checking (run before submitting)
pnpm run typecheck    # TypeScript type check only
```

### Backend (Strapi)

```bash
cd backend

# Install dependencies
pnpm install

# Development
pnpm run dev          # Start Strapi dev server on port 1337
pnpm run console      # Open Strapi console

# Build & Run
pnpm run build        # Build Strapi admin panel
pnpm run start        # Start production server

# Database migrations
pnpm run migrate:audio # Run audio migration script
```

### Running Single Tests

**Note**: There are currently no automated tests in this codebase. Before submitting changes:
- Always run `pnpm run typecheck` to verify TypeScript types
- Run a full build with `pnpm run build` for code/config changes
- Run the dev server to preview content changes

---

## Code Style Guidelines

### General Principles

- **TypeScript throughout** - All application code must be TypeScript. Small Node build scripts may use JS.
- **4-space indentation** - Follow `.editorconfig` (indent_size: 4)
- **Semicolons** - Use semicolons at the end of statements
- **Single quotes** - Use single quotes for strings (see `.prettierrc`)
- **LF line endings** - Use Unix-style line endings

### Formatting (Prettier)

The project uses Prettier with these settings (`.prettierrc`):
```json
{
    "arrowParens": "always",
    "bracketSpacing": false,
    "jsxBracketSameLine": true,
    "jsxSingleQuote": true,
    "trailingComma": "es5",
    "tabWidth": 4,
    "semi": true,
    "singleQuote": true,
    "quoteProps": "consistent",
    "endOfLine": "lf"
}
```

### TypeScript Configuration

- **Frontend**: `strict: true` - Full strict mode enabled
- **Backend**: `strict: false` - Strapi default (relaxed)
- Use `type` instead of `interface` for props and simple types
- Use `type` for unions, intersections, and primitives

### Imports

- **Absolute imports** - Use path aliases (e.g., `@/src/lib/...`)
- **Named imports** - Prefer named imports: `import {Something} from '...'`
- **Type imports** - Use `import type {Type}` when only using types
- **Group order**: External → Internal → Components → Styles/Assets

Example:
```typescript
import Image from 'next/image';
import Link from 'next/link';
import {type StrapiArticle} from '@/src/lib/rss/articlefeed';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {routes} from '@/src/lib/routes';
import styles from './Component.module.css';
import placeholderCover from '@/public/images/m10z.jpg';
import {AuthorList} from './AuthorList';
```

### Naming Conventions

- **Components**: PascalCase (e.g., `ArticleCard`, `SearchModal`)
- **Files**: PascalCase for components (e.g., `ArticleCard.tsx`), camelCase otherwise
- **Types/Interfaces**: PascalCase with meaningful names (e.g., `StrapiArticle`)
- **Props**: PascalCase for component props types (e.g., `ArticleCardProps`)
- **Variables/functions**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE for config values

### React/Next.js Patterns

- **Server Components** - Default in App Router; use `'use client'` only when needed
- **SWR** - Use SWR for client-side data fetching with built-in caching/deduplication
- **CSS Modules** - Use `.module.css` files for component-scoped styles
- **Image optimization** - Use Next.js `<Image>` component for all images

### Error Handling

- Use try/catch with async/await for API calls
- Provide meaningful error messages
- Handle null/undefined states explicitly
- Use TypeScript's non-null assertion sparingly (prefer proper null checks)

### Performance Guidelines

Follow the Cursor rules in `.cursor/rules/` for performance optimization:

1. **Async/Waterfalls** (CRITICAL) - Avoid sequential awaits; use `Promise.all()` for parallel fetching
2. **Bundle Size** (CRITICAL) - Use dynamic imports, avoid barrel imports, defer third-party libs
3. **Server-Side** (HIGH) - Optimize SSR and data fetching patterns
4. **Client Data** (MEDIUM-HIGH) - Leverage SWR deduplication
5. **Re-renders** (MEDIUM) - Use `useMemo`, `useCallback`, React.memo appropriately

---

## Environment Variables

### Frontend (.env.local)

```env
STRAPI_URL=http://localhost:1337
STRAPI_PREVIEW_SECRET=your_secret_here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Backend (.env)

See `backend/.env.example` for required variables:
- `CLIENT_URL` - Frontend URL
- `FRONTEND_URL` - Production frontend URL
- `FEED_INVALIDATION_TOKEN` - Secret for cache invalidation
- `STRAPI_PREVIEW_SECRET` - Must match frontend

---

## Security Guidelines

- Never commit secrets, API keys, or credentials to the repository
- Use `.env.local` for local development (already gitignored)
- Validate all user inputs
- Use parameterized queries for database operations
- Follow the security rules in `.cursor/rules/security-*`

---

## Submission Checklist

Before submitting changes:

- [ ] Run `pnpm run typecheck` - TypeScript types pass
- [ ] Run `pnpm run build` - Production build succeeds
- [ ] No unrelated files added
- [ ] Follow code style and conventions
- [ ] Provide a summary of changes
