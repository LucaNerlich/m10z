# Cache Strategy Documentation

This document describes the caching strategy used in the Next.js frontend application, including cache tag naming conventions, usage patterns, and invalidation mechanisms.

## Overview

The application uses a two-tier caching approach:

1. **Server-Side Caching**: Next.js cache tags and time-based revalidation for Server Components
2. **Client-Side Caching**: SWR (stale-while-revalidate) for client-side data fetching

## Cache Tag Naming Convention

The application uses a consistent naming convention for cache tags:

- **`strapi:{content-type}`** - Content-type tags for Strapi content (e.g., `strapi:article`, `strapi:podcast`, `strapi:author`, `strapi:category`)
- **`feed:{type}`** - RSS feed tags (e.g., `feed:article`, `feed:audio`)
- **`page:{name}`** - Page-specific tags (e.g., `page:home`)
- **`search-index`** - Search index tag

### Content-Type Tags

Content-type tags follow the pattern `strapi:{content-type}` and may include additional qualifiers:

- `strapi:article` - Base tag for all articles
- `strapi:article:{slug}` - Tag for a specific article by slug
- `strapi:article:list` - Tag for article list pages
- `strapi:article:list:page` - Tag for paginated article lists

Similar patterns apply to podcasts (`strapi:podcast`), authors (`strapi:author`), and categories (`strapi:category`).

### Author Section Pages (Paginated)

Author section pages under `/team/{authorSlug}` use author-qualified list tags in addition to the base content tags:

- **Articles by author**: `strapi:article:list:author:{authorSlug}` and `strapi:article:list:author:{authorSlug}:page`
- **Podcasts by author**: `strapi:podcast:list:author:{authorSlug}` and `strapi:podcast:list:author:{authorSlug}:page`

When a category filter is applied (e.g. `/team/{authorSlug}/artikel?category={categorySlug}`), additional tags are attached:

- **Filtered articles by author+category**: `strapi:article:list:author:{authorSlug}:category:{categorySlug}` and `strapi:article:list:author:{authorSlug}:category:{categorySlug}:page`
- **Filtered podcasts by author+category**: `strapi:podcast:list:author:{authorSlug}:category:{categorySlug}` and `strapi:podcast:list:author:{authorSlug}:category:{categorySlug}:page`

These requests also include base tags (`strapi:article` / `strapi:podcast`), author tags (`strapi:author:{authorSlug}`), and (when filtered) category tags (`strapi:category:{categorySlug}`) so existing invalidation endpoints continue to work.

## Tag Usage

### Content Pages

Content pages use content-type tags for cache invalidation:

- **Article pages** (`/artikel`, `/artikel/[slug]`): Use `strapi:article` tags
- **Podcast pages** (`/podcasts`, `/podcasts/[slug]`): Use `strapi:podcast` tags
- **Home page** (`/`): Uses both `strapi:article` and `strapi:podcast` tags, plus `page:home`

### Feed Endpoints

RSS feed endpoints use feed-specific tags and revalidate periods:

- **Article feed** (`/rss.xml`): Uses `feed:article` tag with `CACHE_REVALIDATE_DEFAULT` (3600s)
- **Audio feed** (`/audiofeed.xml`): Uses `feed:audio` tag with `CACHE_REVALIDATE_DEFAULT` (3600s)

### Invalidation Endpoints

Invalidation endpoints revalidate both tag types to ensure consistency:

- **`/api/articlefeed/invalidate`**: Revalidates both `feed:article` and `strapi:article` tags
- **`/api/audiofeed/invalidate`**: Revalidates both `feed:audio` and `strapi:podcast` tags

This ensures that when content is updated, both the RSS feeds and the content pages are invalidated together.

## Cache Duration

The application uses a two-tier caching strategy:

1. **Tag-based invalidation** (primary): Takes precedence over time-based expiration
2. **Time-based expiration** (fallback): Provides a safety net for cache refresh

### Explicit Revalidate Periods

Explicit revalidation periods are now applied throughout the codebase as fallback mechanisms to tag-based invalidation. All fetch functions use the `revalidate` option in Next.js fetch's `next` configuration, which works alongside cache tags.

**Note**: As of the Cache Components migration (`cacheComponents: true` in `next.config.ts`), the content-fetching layer (`src/lib/strapiContent.ts`, `src/lib/strapi/singleTypes.ts`, `src/lib/m12g/m12gArchive.ts`) uses the `'use cache'` directive with `cacheTag()`/`cacheLife()` rather than the classic `next: { tags, revalidate }` fetch options. The tag naming and revalidate durations described in this document are unchanged — only the mechanism attaching them changed. `cacheLife()` is called with literal objects (`CACHE_LIFE_CONTENT_DETAIL`/`CACHE_LIFE_CONTENT_LIST` in `src/lib/cache/constants.ts`) rather than named profiles, because TypeScript 7's overload resolution for `cacheLife(profile: string)` doesn't reliably narrow custom profile names. The underlying `strapiTransport.ts`/`contentAccess.ts` fetch layer still passes `next: { tags, revalidate }` as well — this is intentionally redundant during the migration and can be removed once every consumer is confirmed migrated.

### Cache Duration Constants

Cache duration constants are defined in `src/lib/cache/constants.ts`:

- **`CACHE_REVALIDATE_DEFAULT`** (3600 seconds / 1 hour)
  - Used for: List/collection pages, legal/static pages, RSS feeds
  - Applied to: `fetchAuthorsList()`, `fetchCategoriesWithContent()`, `fetchArticlesPage()`, `fetchPodcastsPage()`, `fetchArticlesBySlugs()`, `fetchPodcastsBySlugs()`, `getPrivacy()`, `getImprint()`, `getAbout()`

- **`CACHE_REVALIDATE_CONTENT_PAGE`** (900 seconds / 15 minutes)
  - Used for: Individual content detail pages
  - Applied to: `fetchArticleBySlug()`, `fetchPodcastBySlug()`, `fetchAuthorBySlug()`, `fetchCategoryBySlug()`
  - Shorter duration ensures more frequent updates for detail pages while tag-based invalidation handles immediate updates when content changes

- **`CACHE_REVALIDATE_SEARCH`** (3600 seconds / 1 hour)
  - Used for: Search index API endpoint
  - Applied to: `loadSearchIndex()` in `/api/search-index/route.ts`

### Combined Tag and Revalidate Strategy

Tags and revalidate periods work together:

1. **Tag-based invalidation takes precedence**: When `revalidateTag()` is called, the cache is immediately invalidated regardless of the revalidate period
2. **Revalidate serves as fallback**: If tag invalidation doesn't occur, the cache will automatically refresh after the revalidate period expires
3. **Both are always specified**: All fetch calls include both `tags` and `revalidate` for comprehensive cache management

**Example**:
```typescript
const res = await fetchJson('/api/articles', {
  tags: ['strapi:article', 'strapi:article:list'],
  revalidate: CACHE_REVALIDATE_DEFAULT, // 3600 seconds
});
```

In this example:
- The cache can be immediately invalidated by calling `revalidateTag('strapi:article')`
- If no tag invalidation occurs, the cache will automatically refresh after 1 hour
- Both mechanisms ensure the cache stays fresh

### Cache Duration by Page

- **Home page** (`/`): 900s (15 minutes)
- **Article list** (`/artikel`): Uses `CACHE_REVALIDATE_DEFAULT` (3600s / 1 hour)
- **Podcast list** (`/podcasts`): Uses `CACHE_REVALIDATE_DEFAULT` (3600s / 1 hour)
- **Individual content pages**: Use `CACHE_REVALIDATE_CONTENT_PAGE` (900s / 15 minutes)

## Reference Implementation

The search-index endpoint (`/api/search-index/route.ts`) serves as a reference implementation:

- Uses `tags: ['search-index']` pattern with `revalidate: CACHE_REVALIDATE_SEARCH`
- Implements both tag-based and time-based caching
- Demonstrates proper cache header configuration for different use cases
- Shows how to combine tags and revalidate periods

**Example from search-index route**:
```typescript
const res = await fetch(url, {
  headers: getAuthHeader(),
  next: {
    tags: ['search-index'],
    revalidate: CACHE_REVALIDATE_SEARCH, // 3600 seconds
  },
});
```

## Implementation Details

### Fetch Functions

All fetch functions support cache configuration with both tags and revalidate periods:

**Base utilities** (`src/lib/strapi.ts`):
- `fetchStrapiSingle()`: Accepts `FetchStrapiOptions` with `tags` and `revalidate`
- `fetchStrapiCollection()`: Accepts `FetchStrapiOptions` with `tags` and `revalidate`
- `getPrivacy()`, `getImprint()`, `getAbout()`: Default to `CACHE_REVALIDATE_DEFAULT`

**Content fetching** (`src/lib/strapiContent.ts`):
- `fetchAuthorsList()`: Uses `CACHE_REVALIDATE_DEFAULT`
- `fetchCategoriesWithContent()`: Uses `CACHE_REVALIDATE_DEFAULT`
- `fetchArticlesPage()`: Uses `CACHE_REVALIDATE_DEFAULT`
- `fetchPodcastsPage()`: Uses `CACHE_REVALIDATE_DEFAULT`
- `fetchArticlesBySlugs()`: Uses `CACHE_REVALIDATE_DEFAULT`
- `fetchPodcastsBySlugs()`: Uses `CACHE_REVALIDATE_DEFAULT`
- `fetchArticleBySlug()`: Uses `CACHE_REVALIDATE_CONTENT_PAGE`
- `fetchPodcastBySlug()`: Uses `CACHE_REVALIDATE_CONTENT_PAGE`
- `fetchAuthorBySlug()`: Uses `CACHE_REVALIDATE_CONTENT_PAGE`
- `fetchCategoryBySlug()`: Uses `CACHE_REVALIDATE_CONTENT_PAGE`

**RSS feeds** (`src/lib/rss/feedRoute.ts`):
- `fetchStrapiJson()`: Accepts `revalidate` parameter in `StrapiFetchArgs`

**RSS feed handlers**:
- `buildArticleFeedResponse()` (`src/lib/rss/articleFeedRouteHandler.ts`): Uses `CACHE_REVALIDATE_DEFAULT` for all Strapi fetches
- `buildAudioFeedResponse()` (`src/lib/rss/audioFeedRouteHandler.ts`): Uses `CACHE_REVALIDATE_DEFAULT` for all Strapi fetches

All functions maintain backward compatibility - revalidate is optional and can be overridden via options.

### Invalidation Flow

When content is updated in Strapi:

1. Backend triggers invalidation endpoint
2. Invalidation endpoint calls `revalidateTag()` for both feed and content-type tags
3. Next.js invalidates all cached responses associated with those tags
4. Next request triggers fresh fetch from Strapi API

## Client-Side Caching with SWR

The application uses [SWR](https://swr.vercel.app/) for client-side data fetching and caching. SWR provides automatic caching, request deduplication, background revalidation, and error handling.

### SWR Configuration

Global SWR configuration is defined in `src/lib/swr/config.ts`:

- **Fetcher**: Secure fetcher function that handles errors without exposing sensitive information
- **Revalidation**: Disabled on focus for search queries (prevents unnecessary requests)
- **Deduplication**: 2-second deduplication interval to prevent duplicate requests
- **Error Retry**: Automatic retry with 3 attempts and 5-second intervals

### SWR Hooks

The application provides reusable SWR hooks for common data fetching patterns:

#### `useSearchIndex()`

Fetches and caches the full search index from `/api/search-index`:

```typescript
import {useSearchIndex} from '@/src/hooks/useSearchIndex';

const {data, error, isLoading, isValidating} = useSearchIndex();
```

- **Cache Key**: `['search-index']`
- **Use Case**: Loading the full search index for client-side search operations

#### `useSearchQuery(query, debounceMs?)`

Performs search queries with automatic debouncing:

```typescript
import {useSearchQuery} from '@/src/hooks/useSearchQuery';

const {results, total, error, isLoading, isValidating} = useSearchQuery('search term', 150);
```

- **Cache Key**: `['search-index', query]` (only fetches when query length > 0)
- **Debouncing**: Default 150ms debounce to avoid excessive API calls
- **Use Case**: Search modal and other search interfaces

### SWR Benefits

1. **Automatic Caching**: Data is cached across component mounts/unmounts
2. **Request Deduplication**: Multiple components requesting the same data share one request
3. **Background Revalidation**: Automatic stale-while-revalidate pattern keeps data fresh
4. **Better Error Handling**: Built-in retry logic and error states
5. **Loading States**: Simplified loading state management
6. **Developer Experience**: Less boilerplate, more declarative code

### Migration from Manual Fetching

The search functionality has been migrated from manual `useEffect` + `fetch` patterns to SWR hooks:

- **Before**: Manual debouncing, loading states, error handling, and no caching
- **After**: Automatic debouncing, caching, deduplication, and error handling via SWR

See `src/components/SearchModal.tsx` for an example of SWR usage.

## Known Limitations

### `notFound()` returns HTTP 200 instead of 404 under Cache Components

With `cacheComponents: true`, calling `notFound()` (e.g. for an unknown article/podcast/category/author slug, or a failed preview-secret check) renders the correct "not found" content but the HTTP response status is **200**, not 404. This was verified across `/artikel/[slug]`, `/podcasts/[slug]`, `/kategorien/[slug]`, `/m12g/spiele/[slug]`, and `/preview/artikel/[slug]` — including routes with no `generateStaticParams` and no `<Suspense>` boundaries, and even when forcing fully dynamic rendering via `connection()`.

This is not fixable via route segment config: `dynamic`/`dynamicParams` exports are hard build errors under `cacheComponents`, and `instant = false` does not restore the old blocking-render behavior (routes still partially prerender). The root cause is that Cache Components makes the root layout stream by default, and once a response begins streaming, the initial (200) status code is already committed to the client by the time `notFound()` resolves deeper in the tree — a general Next.js streaming-SSR characteristic that Cache Components makes universal rather than something scoped to Suspense boundaries we added.

**Impact**: search engines and status-code-aware tooling (link checkers, monitoring) will see 200 for genuinely missing content instead of 404. Revisit if/when Next.js addresses this upstream.

## Best Practices

### Server-Side Caching

1. **Always use content-type tags** for content pages to ensure proper invalidation
2. **Use specific tags** (e.g., `strapi:article:{slug}`) for individual items when possible
3. **Invalidate both feed and content tags** when content changes
4. **Always specify both tags and revalidate** - tags for immediate invalidation, revalidate as fallback
5. **Use cache duration constants** from `src/lib/cache/constants.ts` for consistency
6. **Prefer tag-based invalidation** over time-based expiration for immediate updates
7. **Use the `'use cache'` directive** (`cacheTag()`/`cacheLife()`) for new content-fetching functions, following the pattern in `src/lib/strapiContent.ts`

### Client-Side Caching (SWR)

1. **Use SWR hooks** for all client-side data fetching
2. **Leverage automatic caching** - don't manually cache data that SWR can handle
3. **Use conditional fetching** - set SWR key to `null` when data shouldn't be fetched
4. **Configure revalidation appropriately** - disable `revalidateOnFocus` for search/input fields
5. **Handle errors securely** - ensure error messages don't expose sensitive information
6. **Use debouncing** for user input - implement debouncing in hooks, not components

