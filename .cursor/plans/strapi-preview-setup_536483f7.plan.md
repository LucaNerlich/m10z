---
name: strapi-preview-setup
overview: Enable Strapi preview handling and add secure preview routes and banner in the frontend for draft articles and podcasts, plus robots/env updates.
todos:
  - id: backend-preview-config
    content: Enable Strapi preview config and handler in admin.ts
    status: completed
  - id: env-docs
    content: Add STRAPI_PREVIEW_SECRET to backend/frontend env examples
    status: completed
  - id: frontend-preview-fetch
    content: Add draft preview fetchers in strapiContent.ts
    status: completed
  - id: preview-banner
    content: Create PreviewBanner component and styles
    status: completed
  - id: preview-routes
    content: Add preview article/podcast routes with auth + noindex
    status: completed
  - id: robots-update
    content: Disallow /preview/ in robots.ts
    status: completed
---

# Strapi Preview Enablement

## Scope

- Backend preview config and handler in [`backend/config/admin.ts`](backend/config/admin.ts).
- Frontend preview fetchers in [`frontend/src/lib/strapiContent.ts`](frontend/src/lib/strapiContent.ts).
- Preview routes in `[frontend/app/preview/artikel/[slug]/page.tsx](frontend/app/preview/artikel/[slug]/page.tsx)` and `[frontend/app/preview/podcasts/[slug]/page.tsx](frontend/app/preview/podcasts/[slug]/page.tsx)`.
- Preview banner component in [`frontend/src/components/PreviewBanner.tsx`](frontend/src/components/PreviewBanner.tsx).
- Robots exclusion in [`frontend/app/robots.ts`](frontend/app/robots.ts).
- Env docs in [`backend/.env.example`](backend/.env.example) and [`frontend/.env.local.example`](frontend/.env.local.example).

## Key decisions

- Strapi preview `allowedOrigins`: `https://m10z.de` and `http://localhost:3000`.
- Preview URL base: `https://m10z.de`.
- Invalid preview secret response: return `401`.

## Implementation details

- Update Strapi admin config preview to:
- `enabled: true`.
- `allowedOrigins: ['https://m10z.de', 'http://localhost:3000']`.
- `handler(uid, {documentId, locale, status})` that:
- Uses `strapi.documents(uid).findOne({ documentId })` to read `slug`.
- Maps `api::article.article` to `/preview/artikel/{slug}` and `api::podcast.podcast` to `/preview/podcasts/{slug}`.
- Adds `?secret=${STRAPI_PREVIEW_SECRET}` to the URL.
- Returns `null` for other UIDs.
- Add `STRAPI_PREVIEW_SECRET` example entries in env example files with a short comment noting it must match frontend.
- Add draft-aware fetchers:
- `fetchArticleBySlugForPreview(slug)` and `fetchPodcastBySlugForPreview(slug)` in `strapiContent.ts`.
- Reuse existing populate and fields, but set `status: 'draft'` and request `cache: 'no-store'` (likely via a new `fetchJsonNoStore` or optional fetch options to `fetchJson`).
- Create preview routes mirroring existing detail pages:
- Use `validateSlugSafe`, `verifySecret`, `fetch*ForPreview`, and render `ArticleDetail` / `PodcastDetail`.
- Add preview banner at the top.
- Export `dynamic = 'force-dynamic'`.
- `generateMetadata()` returns `{ robots: { index: false, follow: false } }` (or equivalent) to enforce noindex.
- Return `new Response('Unauthorized', { status: 401 })` on invalid secret.
- Create `PreviewBanner` client component with sticky/fixed warning styling consistent with existing CSS strategy (likely CSS modules alongside component or a shared styles file).
- Update `robots.ts` production rules to disallow `/preview/` while keeping existing `/api/` rule and sitemap logic intact.

## Notes / snippets to reuse

- Secret validation via `verifySecret()` used in API routes; reuse same pattern.
- Existing detail pages in `[frontend/app/artikel/[slug]/page.tsx](frontend/app/artikel/[slug]/page.tsx)` and `[frontend/app/podcasts/[slug]/page.tsx](frontend/app/podcasts/[slug]/page.tsx)` show how to fetch and render detail components.

## Risks & mitigations

- Preview access must not leak draft content; enforce secret check server-side before fetching/rendering.
- No caching for preview requests to avoid stale drafts; explicitly set `cache: 'no-store'` and `dynamic = 'force-dynamic'`.
- Robots exclusion ensures preview URLs are not indexed.

## Open items

- None (production URL and localhost confirmed; no staging).