---
name: Feeds Tutorial Page Implementation
overview: Implement a feeds tutorial page following the established single-type pattern used for imprint/privacy pages. This includes creating the Strapi backend content type, data fetching function, frontend page component, and navigation link.
todos:
  - id: backend-schema
    content: Create schema.json for feeds content type with single-type configuration, title and content fields
    status: completed
  - id: backend-api
    content: Create controller, service, and routes files for feeds API using Strapi factories
    status: completed
    dependencies:
      - backend-schema
  - id: frontend-types
    content: Add StrapiFeeds interface and assertIsFeeds validation function to strapi.ts
    status: completed
  - id: frontend-fetch
    content: Implement getFeeds() and getFeedsWithFallback() functions following getImprint/getPrivacy pattern
    status: completed
    dependencies:
      - frontend-types
  - id: frontend-page
    content: Create /feeds page component with metadata, server component implementation, and Markdown rendering
    status: completed
    dependencies:
      - frontend-fetch
  - id: frontend-nav
    content: Add feeds link to Header.tsx secondaryLinks array for burger menu navigation
    status: completed
---

# Feeds Tutorial Page Implementation

This plan implements a feeds tutorial page that follows the established single-type pattern used for other static pages like imprint and privacy.

## Architecture Overview

The implementation follows this flow:

1. **Backend (Strapi)**: Create feeds content type as single-type with schema, controller, service, and routes
2. **Frontend (Data Layer)**: Add `getFeeds()` function to fetch content from Strapi API
3. **Frontend (Page)**: Create `/feeds` page component that renders the tutorial content
4. **Frontend (Navigation)**: Add feeds link to burger menu navigation

## Implementation Tasks

### Task 1: Backend Content Type Setup

Create the Strapi backend content type following the imprint pattern:

**Schema** (`backend/src/api/feeds/content-types/feeds/schema.json`):

- Set `"kind": "singleType"` and `"draftAndPublish": false` (matching imprint pattern)
- Add `title` field (string, required, default: "RSS-Feeds" or similar)
- Add `content` field (richtext, required)
- Use same structure as `backend/src/api/imprint/content-types/imprint/schema.json`

**API Layer Files**:

- **Controller** (`backend/src/api/feeds/controllers/feeds.ts`): Use `factories.createCoreController('api::feeds.feeds')`
- **Service** (`backend/src/api/feeds/services/feeds.ts`): Use `factories.createCoreService('api::feeds.feeds')`
- **Routes** (`backend/src/api/feeds/routes/feeds.ts`): Use `factories.createCoreRouter('api::feeds.feeds')`

**Optional**: Consider adding `lifecycles.ts` for cache invalidation (imprint/privacy use this), but not required for initial implementation.

### Task 2: Data Fetching Function

Add `getFeeds()` to `frontend/src/lib/strapi.ts`:

- Follow the same pattern as `getImprint()` and `getPrivacy()` functions
- Create `StrapiFeeds` interface matching `StrapiLegalDoc` structure (id, documentId, title, content, timestamps)
- Create `assertIsFeeds()` validation function
- Create `getFeedsWithFallback()` helper with fallback content
- Export `getFeeds()` that accepts `FetchStrapiOptions` with tags parameter (e.g., `['feeds', 'strapi:feeds']`)
- Use `fetchStrapiSingle<StrapiFeeds>('feeds', '', options)` to fetch from `/api/feeds` endpoint
- Apply default cache revalidation using `CACHE_REVALIDATE_DEFAULT`

### Task 3: Frontend Page Component

Create `frontend/app/feeds/page.tsx`:

- Implement as async server component
- Call `getFeeds()` with appropriate cache tags
- Use `<main data-list-page>` wrapper (matching impressum/datenschutz pattern)
- Render `<h1>{feeds.title}</h1>` and `<Markdown markdown={feeds.content} />`
- Include links to feed URLs in markdown content:
- `/rss.xml` for articles (use `routes.articleFeed`)
- `/audiofeed.xml` for podcasts (use `routes.audioFeed`)

**Metadata** (`metadata` export):

- Title: "RSS-Feeds" (or German equivalent)
- Description: Appropriate description about RSS feeds
- `openGraph`: type 'website', locale, siteName, url (`absoluteRoute('/feeds')`), images
- `robots`: index true, follow true
- `alternates.canonical`: `absoluteRoute('/feeds')`
- Follow structure from `frontend/app/impressum/page.tsx` and `frontend/app/datenschutz/page.tsx`

### Task 4: Navigation Link

Update `frontend/src/components/Header.tsx`:

- Add new link to `secondaryLinks` array: `{label: 'RSS-Feeds', href: '/feeds'}` (or German equivalent)
- Place it logically within existing secondary navigation items (after "Über uns" or at end)
- The link will automatically appear in burger menu via `HeaderClient` component

## Files to Create/Modify

**New Files**:

- `backend/src/api/feeds/content-types/feeds/schema.json`
- `backend/src/api/feeds/controllers/feeds.ts`
- `backend/src/api/feeds/services/feeds.ts`
- `backend/src/api/feeds/routes/feeds.ts`
- `frontend/app/feeds/page.tsx`

**Modified Files**:

- `frontend/src/lib/strapi.ts` (add `getFeeds()` function and `StrapiFeeds` interface)
- `frontend/src/components/Header.tsx` (add feeds link to `secondaryLinks`)

## Notes

- The feeds content type uses the same structure as imprint/privacy (single-type, no draft/publish)
- Cache tags should follow the pattern: `['feeds', 'strapi:feeds']`
- Feed URLs are already defined in `routes` object (`routes.articleFeed` and `routes.audioFeed`)
- The page follows the minimal structure pattern used for legal pages
- All implementations follow existing codebase patterns for consistency