---
name: Author paginated sections
overview: Add Strapi paginated-by-author fetchers (optionally category-filtered), a stats utility, an AuthorNav component, and new author section pages for Artikel/Podcasts. Update the author overview to show stats + previews, and ensure cache tags align with existing invalidation endpoints.
todos:
  - id: strapi-author-pagination
    content: Add paginated-by-author (and optional category-filtered) Strapi fetchers returning PaginatedResult, with cache tags + revalidate.
    status: completed
  - id: author-stats-util
    content: Create computeAuthorContentStats utility returning totals + category breakdowns for articles and podcasts.
    status: completed
    dependencies:
      - strapi-author-pagination
  - id: author-nav-component
    content: Create AuthorNav component + CSS module, highlighting active section and responsive layout.
    status: completed
  - id: author-overview-update
    content: Refactor /team/[slug] overview page to show stats + previews and add AuthorNav; remove batched fetches.
    status: completed
    dependencies:
      - strapi-author-pagination
      - author-stats-util
      - author-nav-component
  - id: author-subpages
    content: Create /team/[slug]/artikel and /team/[slug]/podcasts pages with pagination, category filter, SEO metadata, and empty/out-of-range handling.
    status: completed
    dependencies:
      - strapi-author-pagination
      - author-nav-component
  - id: cache-docs-update
    content: Verify invalidation coverage for new tags and update frontend/CACHING.md with author list tag patterns.
    status: completed
    dependencies:
      - strapi-author-pagination
---

# Author pages: paginated content + nav + stats

## Goals

- Add **server-side paginated fetching** for author-filtered articles/podcasts (plus the category-filtered variant implied by your navigation choice).
- Introduce an **AuthorNav** component to switch between author sections.
- Turn the author overview into a **stats + previews** page (no more full batched slug fetch).
- Create **dedicated paginated sub-pages** for articles/podcasts with empty states and out-of-range page handling.
- Ensure **cache tags** are compatible with existing invalidation endpoints and document any new tag patterns.

## Implementation steps

### 1) Add paginated-by-author Strapi fetchers

- Update [`frontend/src/lib/strapiContent.ts`](/Users/nerlich/workspace/luca/m10z/frontend/src/lib/strapiContent.ts):
- Add `fetchArticlesByAuthorPaginated(authorSlug, page, pageSize, categorySlug?)`.
- Add `fetchPodcastsByAuthorPaginated(authorSlug, page, pageSize, categorySlug?)`.
- Use Strapi filter structure equivalent to:
    - `filters[authors][slug][$eq]=<authorSlug>`
    - and when `categorySlug` is provided: `filters[categories][slug][$eq]=<categorySlug>`
    - `pagination[page]=...` / `pagination[pageSize]=...`
- Return the existing `PaginatedResult<T>` using the existing helper `toPaginatedResult()`.
- **Caching**: apply `revalidate: CACHE_REVALIDATE_DEFAULT` and include tags:
    - Always: `strapi:article` or `strapi:podcast`
    - Always: `strapi:author:${authorSlug}` (so author-page caches can be invalidated by author updates too)
    - When category filter is used: include `strapi:category:${categorySlug}`
    - Add list-scope tags to support targeted invalidation patterns and observability, e.g.
    - `strapi:article:list:author:${authorSlug}` and `strapi:article:list:author:${authorSlug}:page`
    - `strapi:podcast:list:author:${authorSlug}` and `strapi:podcast:list:author:${authorSlug}:page`
    - If filtered: append `:category:${categorySlug}` before `:page`

### 2) Add stats utility

- Add a new utility file in `frontend/src/lib/` (e.g. [`frontend/src/lib/authorContentStats.ts`](/Users/nerlich/workspace/luca/m10z/frontend/src/lib/authorContentStats.ts)) exporting `computeAuthorContentStats(articles, podcasts)`.
- Behavior:
- **Totals**: return total counts for articles and podcasts.
- **Category breakdowns**: compute frequency of categories across the provided items.
- Output shape will be designed to render:
    - top categories (sorted desc by count, then title)
    - each entry includes `slug`, `title`, `count`

### 3) Add AuthorNav component

- Create [`frontend/src/components/AuthorNav.tsx`](/Users/nerlich/workspace/luca/m10z/frontend/src/components/AuthorNav.tsx) + [`frontend/src/components/AuthorNav.module.css`](/Users/nerlich/workspace/luca/m10z/frontend/src/components/AuthorNav.module.css).
- Props:
- `authorSlug: string`
- `activeSection: 'overview' | 'artikel' | 'podcasts'`
- Render links:
- Overview: `/team/{slug}`
- Artikel: `/team/{slug}/artikel`
- Podcasts: `/team/{slug}/podcasts`
- Styling:
- active link highlight (e.g. `aria-current="page"` + active class)
- responsive layout: horizontal on desktop; on mobile allow wrap or horizontal scroll (matching existing “tag list” ergonomics).

### 4) Update author overview to “stats + previews”

- Modify `[frontend/app/team/[slug]/page.tsx](/Users/nerlich/workspace/luca/m10z/frontend/app/team/[slug]/page.tsx)`:
- Keep `AuthorHeader`.
- Insert `AuthorNav` below it.
- Replace full lists with:
    - Summary section per content type showing total count + top categories.
    - Preview grid (3–4 most recent items) + “View all” link to the relevant subpage.
- Data fetching changes:
    - Remove `fetchArticlesBySlugsBatched` / `fetchPodcastsBySlugsBatched`.
    - Fetch only page 1 for each content type via the new paginated-by-author fetchers.
    - Use a **moderate pageSize** (e.g. 20) to compute category breakdowns with decent signal, while still only rendering 3–4 previews.
- Category links:
    - Link to the respective author subpage **with category filter**:
    - `/team/{slug}/artikel?category={categorySlug}`
    - `/team/{slug}/podcasts?category={categorySlug}`
- Empty/zero behavior:
    - If total is 0 for a section: hide or de-emphasize it.
    - If both totals are 0: show `EmptyState`.

### 5) Add new paginated sub-pages

- Create `[frontend/app/team/[slug]/artikel/page.tsx](/Users/nerlich/workspace/luca/m10z/frontend/app/team/[slug]/artikel/page.tsx)`:
- Validate `params.slug` with `validateSlugSafe`.
- Parse `searchParams.page` (positive int), parse `searchParams.category` (validate slug; ignore if invalid).
- Fetch author via `fetchAuthorBySlug` and articles via `fetchArticlesByAuthorPaginated(slug, page, pageSize, categorySlug?)`.
- Render:
    - `AuthorHeader`, `AuthorNav` (active “Artikel”), filtered title if category present, `ContentGrid` + `ArticleCard`, and `Pagination`.
- Empty state:
    - If result total is 0: show a clear message (and if category filter is active, mention it + link to unfiltered “all”).
- Out-of-range pages:
    - If `total > 0` and requested `page > pageCount`: show an empty state “page does not exist” and link to page 1 (per your preference).
- SEO metadata:
    - `generateMetadata()` with author name + “Artikel”.
    - If `category` filter is present: set `robots` to `noindex, follow` (to avoid duplicate-indexed query variants) and keep canonical to the base section URL.
- Create `[frontend/app/team/[slug]/podcasts/page.tsx](/Users/nerlich/workspace/luca/m10z/frontend/app/team/[slug]/podcasts/page.tsx) `analogously using `fetchPodcastsByAuthorPaginated` + `PodcastCard`.

### 6) Cache invalidation verification + docs

- Verify cache tag coverage:
- Existing endpoints revalidate broad tags (`strapi:article`, `strapi:podcast`, `strapi:author`, and list tags). Since the new queries will include `strapi:article`/`strapi:podcast`, they will already be covered.
- Add author+category list tags mainly for traceability and possible future targeted invalidations.
- Update [`frontend/CACHING.md`](/Users/nerlich/workspace/luca/m10z/frontend/CACHING.md) with the new tag patterns for author list pages (and category-filtered variants).

## Notes / constraints

- All query params (`slug`, `page`, `category`) will be validated/clamped (security-first).