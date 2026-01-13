# Migration from Docusaurus to Strapi CMS + Next.js SSR

## Overview

Rebuild the M10Z blog and podcast platform using Strapi CMS for content management and Next.js for the frontend, enabling authors to self-service create posts and audio feed items while maintaining existing functionality.

## Architecture

```
┌─────────────────┐
│   Next.js SSR   │  ← Public-facing website
│   (Frontend)    │     - Blog posts
│                 │     - Podcast pages
│                 │     - RSS feeds (/audiofeed.xml)
└────────┬────────┘
         │
         │ REST API
         │
┌────────▼────────┐
│   Strapi CMS    │  ← Content management
│   (Backend)     │     - Content types
│                 │     - Media library
│                 │     - Author management
└────────┬────────┘
         │
┌────────▼────────┐
│  PostgreSQL     │  ← Database
│                 │
└─────────────────┘
```

## Project Structure

```
m10z/
├── strapi/                    # Strapi CMS application
│   ├── src/
│   │   ├── api/              # Content types (Post, AudioEpisode, Author)
│   │   ├── components/       # Reusable components
│   │   ├── config/           # Strapi configuration
│   │   └── plugins/           # Custom plugins
│   ├── database/             # Database migrations
│   └── public/               # Uploaded assets (self-hosted)
├── nextjs/                    # Next.js frontend
│   ├── app/                  # App router pages
│   │   ├── (blog)/          # Blog routes
│   │   ├── (podcasts)/      # Podcast routes
│   │   └── audiofeed.xml    # RSS feed route
│   ├── components/           # React components
│   ├── lib/                  # API clients, utilities
│   └── public/              # Static assets
├── scripts/
│   └── migrate-content.js   # Migration script
└── docker-compose.yml        # Local development setup
```

## Implementation Plan

### Phase 1: Strapi Setup

**Content Types to Create:**

1. **Post** (Blog Articles)

   - Fields: title, slug, content (RichText), excerpt, publishedAt, featuredImage, authors (relation), tags (relation), category, seoMeta
   - Categories: announcement, briefbookmarks, experience, kommentare, reviews, tech, etc.

2. **AudioEpisode** (Podcast Episodes)

   - Fields: title, slug, description (RichText), publishedAt, audioFile (Media), coverImage (Media), duration (seconds), blogPost (relation to Post), podcastFormat (relation)
   - Links to blog posts when available

3. **Author**

   - Fields: name, slug, bio, avatar (Media), email, socialLinks (JSON), page (boolean)

4. **PodcastFormat**

   - Fields: name, slug, description, coverImage (Media)

5. **Tag**

   - Fields: name, slug

**Strapi Configuration:**

- Configure local filesystem provider for media uploads
- Set up PostgreSQL connection
- Configure API permissions (public read, authenticated write)
- Set up user roles (Author, Editor, Admin)

### Phase 2: Next.js Frontend

**Key Features:**

- Server-side rendering for SEO
- Dynamic routes for posts (`/posts/[slug]`)
- Dynamic routes for podcasts (`/podcasts/[format]/[slug]`)
- RSS feed generation at `/audiofeed.xml`
- Blog listing with pagination
- Author pages
- Tag/category filtering

**API Integration:**

- Create Strapi API client using REST API
- Implement ISR (Incremental Static Regeneration) for performance
- Cache RSS feed generation

### Phase 3: Migration Script

**Migration Tasks:**

1. Parse existing MDX files from `blog/articles/` and `blog/podcasts/`
2. Parse audio feed episodes from `static/audiofeed/episodes/`
3. Import authors from `blog/authors.yml`
4. Create Strapi entries via API
5. Upload media files to Strapi media library
6. Link audio episodes to blog posts where applicable

### Phase 4: RSS Feed Generation with Caching Strategy

**Multi-Layer Caching Approach:**

The RSS feed will use a combination of caching strategies to avoid regenerating XML on every request while ensuring fresh content when new episodes are published.

**Caching Flow:**

```
Request → /audiofeed.xml
    │
    ├─→ Check Next.js ISR Cache (Layer 1)
    │   ├─→ Cache Hit → Return cached XML (no Strapi query)
    │   └─→ Cache Miss → Continue
    │
    ├─→ Check In-Memory Cache (Layer 3)
    │   ├─→ Cache Hit → Return cached XML
    │   └─→ Cache Miss → Continue
    │
    └─→ Query Strapi API
        ├─→ Fetch episodes
        ├─→ Generate RSS XML
        ├─→ Store in cache (ISR + in-memory)
        └─→ Return XML with cache headers

New Episode Published in Strapi
    │
    └─→ Strapi Webhook (Layer 2)
        └─→ POST /api/revalidate?path=/audiofeed.xml
            ├─→ Verify secret
            ├─→ Invalidate Next.js ISR cache
            ├─→ Clear in-memory cache
            └─→ Next request regenerates feed
```

#### Layer 1: Next.js ISR (Incremental Static Regeneration)

- Use Next.js Route Handler with `revalidate` option
- Set revalidation period (e.g., 3600 seconds = 1 hour)
- Next.js will serve cached XML and regenerate in background after revalidation period
- Implementation: `export const revalidate = 3600` in route handler

#### Layer 2: Cache Invalidation via Strapi Webhook

- Configure Strapi webhook that triggers on `audio-episode.create` and `audio-episode.update` events
- Webhook calls Next.js API endpoint (e.g., `/api/revalidate?secret=...&path=/audiofeed.xml`)
- Next.js revalidation API invalidates the cached feed immediately
- Ensures new episodes appear in RSS feed within seconds of publishing

#### Layer 3: In-Memory Cache (Fallback)

- Store generated XML in memory with TTL
- Cache key includes latest episode `publishedAt` timestamp
- If cache exists and latest episode timestamp matches, serve from memory
- Fallback if ISR cache is unavailable

#### Layer 4: HTTP Caching Headers

- Set `ETag` header based on latest episode timestamp
- Set `Last-Modified` header from latest episode `publishedAt`
- Set `Cache-Control: public, max-age=3600, must-revalidate`
- Browser/CDN can cache but will revalidate when needed

**Implementation Details:**

```typescript
// nextjs/app/audiofeed.xml/route.ts
export const revalidate = 3600; // Revalidate every hour

export async function GET(request: Request) {
  // Check cache first (in-memory or Next.js cache)
  // Query Strapi for episodes (only if cache miss)
  // Generate RSS XML
  // Set appropriate cache headers
  // Return XML response
}
```
```typescript
// nextjs/app/api/revalidate/route.ts
// Called by Strapi webhook
export async function POST(request: Request) {
  // Verify webhook secret
  // Revalidate /audiofeed.xml path
  // Clear in-memory cache if used
}
```

**Strapi Webhook Configuration:**

- Event: `audio-episode.create`, `audio-episode.update`
- URL: `https://m10z.de/api/revalidate?secret=${WEBHOOK_SECRET}&path=/audiofeed.xml`
- Method: POST
- Headers: Include authentication secret

**File Size Caching:**

- Cache audio file sizes in database or Redis (optional)
- Current implementation uses file-size-cache.json
- Can be stored in Strapi custom field or separate cache table
- Update cache when episodes are published/updated

**Performance Optimizations:**

1. **Query Optimization:**

   - Only fetch published episodes ordered by `publishedAt DESC`
   - Limit fields fetched from Strapi (exclude unnecessary relations)
   - Use Strapi's `publicationState` filter to ensure only published content

2. **XML Generation:**

   - Use streaming XML generation for large feeds
   - Cache file sizes separately (don't fetch on every generation)
   - Pre-calculate durations and other metadata

3. **Cache Key Strategy:**

   - Use latest episode's `publishedAt` timestamp as cache key component
   - If timestamp unchanged, serve cached version
   - Timestamp changes trigger regeneration

4. **Edge Cases:**

   - Handle webhook failures gracefully (fallback to time-based revalidation)
   - Rate limit webhook endpoint to prevent abuse
   - Log cache hits/misses for monitoring
   - Handle Strapi API failures (serve stale cache if available)

### Phase 5: Deployment & Backup

**Backup Strategy:**

- Regular backups of PostgreSQL database
- Regular backups of `strapi/public/uploads/` directory
- Automated backup script for SSD storage

## Key Files to Create/Modify

### Strapi

- `strapi/src/api/post/content-types/post/schema.json` - Post content type
- `strapi/src/api/audio-episode/content-types/audio-episode/schema.json` - Audio episode content type
- `strapi/src/api/author/content-types/author/schema.json` - Author content type
- `strapi/config/database.js` - PostgreSQL configuration
- `strapi/config/plugins.js` - Media library configuration
- `strapi/config/webhooks.js` - Webhook configuration for cache invalidation

### Next.js

- `nextjs/app/(blog)/posts/[slug]/page.tsx` - Blog post page
- `nextjs/app/(podcasts)/podcasts/[format]/[slug]/page.tsx` - Podcast episode page
- `nextjs/app/audiofeed.xml/route.ts` - RSS feed API route with ISR caching
- `nextjs/app/api/revalidate/route.ts` - Cache invalidation endpoint for webhooks
- `nextjs/lib/rss-cache.ts` - In-memory cache utilities (optional fallback)
- `nextjs/lib/strapi.ts` - Strapi API client
- `nextjs/app/layout.tsx` - Root layout with navigation

### Migration

- `scripts/migrate-content.js` - Content migration script

### Infrastructure

- `docker-compose.yml` - Local development with Strapi, Next.js, PostgreSQL
- `scripts/backup.sh` - Backup script for database and assets

## Migration Considerations

1. **URL Structure**: Maintain existing URL patterns where possible (`/posts/[slug]`, `/podcasts/[format]/[slug]`)
2. **SEO**: Ensure all existing URLs redirect properly or maintain same structure
3. **RSS Feed**: Must match current format exactly for podcast clients
4. **Assets**: Migrate all images from `static/img/` to Strapi media library
5. **Authors**: Import all authors from `authors.yml` with social links

## Security Considerations

- Strapi authentication for content creators
- Rate limiting on API endpoints
- Input validation on all content fields
- Secure file upload handling
- Environment variables for sensitive config