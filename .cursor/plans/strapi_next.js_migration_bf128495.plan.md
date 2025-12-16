---
name: Strapi Next.js Migration
overview: Migrate from Docusaurus to Strapi CMS + Next.js SSR for self-service content management, maintaining RSS feed compatibility and self-hosted assets.
todos:
  - id: setup-strapi
    content: Initialize Strapi project with PostgreSQL configuration and create content types (Post, AudioEpisode, Author, PodcastFormat, Tag)
    status: pending
  - id: setup-nextjs
    content: Initialize Next.js project with TypeScript and create basic structure (app router, components, lib)
    status: pending
  - id: create-strapi-content-types
    content: Define all content type schemas in Strapi (fields, relations, validations)
    status: pending
    dependencies:
      - setup-strapi
  - id: configure-strapi-media
    content: Configure Strapi local filesystem provider for media uploads and set up permissions
    status: pending
    dependencies:
      - setup-strapi
  - id: build-nextjs-api-client
    content: Create Strapi REST API client library in Next.js with TypeScript types
    status: pending
    dependencies:
      - setup-nextjs
  - id: implement-blog-pages
    content: Create Next.js pages for blog posts (listing, detail, categories, tags)
    status: pending
    dependencies:
      - build-nextjs-api-client
  - id: implement-podcast-pages
    content: Create Next.js pages for podcast episodes (listing by format, detail pages)
    status: pending
    dependencies:
      - build-nextjs-api-client
  - id: implement-rss-feed
    content: Create Next.js API route for /audiofeed.xml RSS feed generation matching current format
    status: pending
    dependencies:
      - build-nextjs-api-client
  - id: create-migration-script
    content: Build migration script to import existing MDX posts, audio episodes, and authors into Strapi
    status: pending
    dependencies:
      - create-strapi-content-types
  - id: setup-docker-compose
    content: Create docker-compose.yml for local development (Strapi, Next.js, PostgreSQL)
    status: pending
    dependencies:
      - setup-strapi
      - setup-nextjs
  - id: create-backup-script
    content: Create backup script for PostgreSQL database and Strapi uploads directory
    status: pending
    dependencies:
      - setup-strapi
  - id: migrate-assets
    content: Migrate all images from static/img/ to Strapi media library and update references
    status: pending
    dependencies:
      - configure-strapi-media
      - create-migration-script
---

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

### Phase 4: RSS Feed Generation

**Implementation:**

- Create Next.js API route at `/app/audiofeed.xml/route.ts`
- Query Strapi for published AudioEpisode entries
- Generate RSS XML matching current format
- Include iTunes/podcast namespace elements
- Calculate file sizes (cache or fetch from Strapi)

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

### Next.js

- `nextjs/app/(blog)/posts/[slug]/page.tsx` - Blog post page
- `nextjs/app/(podcasts)/podcasts/[format]/[slug]/page.tsx` - Podcast episode page
- `nextjs/app/audiofeed.xml/route.ts` - RSS feed API route
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