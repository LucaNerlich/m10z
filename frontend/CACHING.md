# Cache Strategy Documentation

This document describes the caching strategy used in the Next.js frontend application, including cache tag naming conventions, usage patterns, and invalidation mechanisms.

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

## Tag Usage

### Content Pages

Content pages use content-type tags for cache invalidation:

- **Article pages** (`/artikel`, `/artikel/[slug]`): Use `strapi:article` tags
- **Podcast pages** (`/podcasts`, `/podcasts/[slug]`): Use `strapi:podcast` tags
- **Home page** (`/`): Uses both `strapi:article` and `strapi:podcast` tags, plus `page:home`

### Feed Endpoints

RSS feed endpoints use feed-specific tags:

- **Article feed** (`/rss.xml`): Uses `feed:article` tag
- **Audio feed** (`/audiofeed.xml`): Uses `feed:audio` tag

### Invalidation Endpoints

Invalidation endpoints revalidate both tag types to ensure consistency:

- **`/api/articlefeed/invalidate`**: Revalidates both `feed:article` and `strapi:article` tags
- **`/api/audiofeed/invalidate`**: Revalidates both `feed:audio` and `strapi:podcast` tags

This ensures that when content is updated, both the RSS feeds and the content pages are invalidated together.

## Cache Duration

The application uses a two-tier caching strategy:

1. **Tag-based invalidation** (primary): Takes precedence over time-based expiration
2. **Time-based expiration** (fallback): Provides a safety net for cache refresh

### Default Cache Duration

- **Most content**: 3600s (1 hour) default
- **Article/podcast pages**: 900s (15 minutes) as fallback mechanism

The shorter duration for article and podcast pages ensures more frequent updates while tag-based invalidation handles immediate updates when content changes.

### Cache Duration by Page

- **Home page** (`/`): 900s (15 minutes)
- **Article list** (`/artikel`): 900s (15 minutes)
- **Podcast list** (`/podcasts`): 900s (15 minutes)
- **Individual content pages**: Inherit from content-type tags (default 3600s)

## Reference Implementation

The search-index endpoint (`/api/search-index/route.ts`) serves as a reference implementation:

- Uses `tags: ['search-index']` pattern
- Implements both tag-based and time-based caching
- Demonstrates proper cache header configuration for different use cases

## Implementation Details

### Fetch Functions

All fetch functions in `src/lib/strapiContent.ts` support cache configuration:

- `fetchArticlesList(options)`: Accepts `revalidate` option
- `fetchPodcastsList(options)`: Accepts `revalidate` option
- `fetchArticlesPage(options)`: Accepts `revalidate` option
- `fetchPodcastsPage(options)`: Accepts `revalidate` option

### Invalidation Flow

When content is updated in Strapi:

1. Backend triggers invalidation endpoint
2. Invalidation endpoint calls `revalidateTag()` for both feed and content-type tags
3. Next.js invalidates all cached responses associated with those tags
4. Next request triggers fresh fetch from Strapi API

## Best Practices

1. **Always use content-type tags** for content pages to ensure proper invalidation
2. **Use specific tags** (e.g., `strapi:article:{slug}`) for individual items when possible
3. **Invalidate both feed and content tags** when content changes
4. **Set appropriate revalidate durations** as fallback mechanisms
5. **Prefer tag-based invalidation** over time-based expiration for immediate updates

