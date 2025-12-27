---
name: Strapi About Page Integration
overview: Integrate Strapi about content type with TypeScript types, data fetching, and page rendering. Update navigation, redirects, and sitemap for discoverability.
todos:
  - id: add-strapi-about-interface
    content: Add StrapiAbout interface to frontend/src/lib/strapi.ts with name, alternateName, content, and logo fields
    status: completed
  - id: create-get-about-function
    content: Create getAbout() function in frontend/src/lib/strapi.ts with populate=logo query, ISR revalidation, error handling, and cache tags
    status: completed
    dependencies:
      - add-strapi-about-interface
  - id: implement-about-page
    content: Update frontend/app/ueber-uns/page.tsx to fetch and render about content with logo, markdown, and SEO metadata
    status: completed
    dependencies:
      - create-get-about-function
  - id: update-header-navigation
    content: Add 'Über uns' link to Header.tsx secondaryLinks array
    status: completed
  - id: update-footer-navigation
    content: Add 'Über uns' link to Footer.tsx 'Inhalte' section
    status: completed
  - id: update-redirect-config
    content: Update /content/hello redirect in next.config.ts to point to /ueber-uns
    status: completed
  - id: update-sitemap
    content: Add /ueber-uns route to sitemap.ts with appropriate priority and changeFrequency
    status: completed
---

# Strapi About Page Integration

Integrate the Strapi about content type into the frontend, following existing patterns for legal pages (imprint/privacy) and media handling.

## Task 1: Strapi Integration

### 1.1 Add StrapiAbout Interface

Add `StrapiAbout` interface to [`frontend/src/lib/strapi.ts`](frontend/src/lib/strapi.ts):

- Fields: `id`, `documentId`, `name` (string), `alternateName` (string | null), `content` (string), `logo` (StrapiMediaRef | null)
- Follow the pattern of `StrapiLegalDoc` interface

### 1.2 Create getAbout() Function

Add `getAbout()` function to [`frontend/src/lib/strapi.ts`](frontend/src/lib/strapi.ts):

- Use `fetchStrapiSingle<StrapiAbout>()` with endpoint `'about'`
- Build query string with `qs.stringify({ populate: 'logo' })` (import `qs` from `'qs'`)
- Apply `FetchStrapiOptions` with:
- `revalidateSeconds: 3600` (1 hour ISR)
- `tags: ['about', 'strapi:about']` for cache invalidation
- Implement error handling with fallback content (similar to `getLegalDocWithFallback`)
- Return `StrapiAbout` type

### 1.3 Update About Page Component

Update existing [`frontend/app/ueber-uns/page.tsx`](frontend/app/ueber-uns/page.tsx) (shell page already exists):

- Import `getAbout` from `@/src/lib/strapi`
- Import `getOptimalMediaFormat`, `mediaUrlToAbsolute`, `normalizeStrapiMedia` from `@/src/lib/rss/media`
- Import `Markdown` from `@/src/lib/markdown/Markdown`
- Import `Image` from `next/image`
- Replace static `metadata` export with `generateMetadata()` function:
- Call `getAbout()` to fetch content
- Use `name` field for `title`
- Extract `description` from content (first paragraph or fallback)
- Keep `robots` and `alternates.canonical` as before
- In page component, call `getAbout()` with revalidation options
- Render in `<main>`:
- `name` as `<h1>` heading
- `alternateName` as subtitle (if present)
- `logo` using Next.js `Image` component:
- Normalize with `normalizeStrapiMedia()`
- Get optimal format with `getOptimalMediaFormat(media, 'medium')`
- Convert to absolute URL with `mediaUrlToAbsolute()`
- Include width/height from media object
- Add appropriate alt text
- `content` using `<Markdown>` component
- Note: `routes.about` already exists in [`frontend/src/lib/routes.ts`](frontend/src/lib/routes.ts) (line 14)

## Task 2: Navigation and Discoverability

### 2.1 Update Header Navigation

Update [`frontend/src/components/Header.tsx`](frontend/src/components/Header.tsx):

- Add `{label: 'Über uns', href: routes.about}` to `secondaryLinks` array (after 'Team')
- This will appear in both desktop menu and mobile burger menu

### 2.2 Update Footer Navigation

Update [`frontend/src/components/Footer.tsx`](frontend/src/components/Footer.tsx):

- Add `{label: 'Über uns', href: routes.about}` to the 'Inhalte' section links array
- Place it after 'Team' link for logical grouping

### 2.3 Update Redirect Configuration

Update [`frontend/next.config.ts`](frontend/next.config.ts):

- Change redirect `/content/hello` destination from `/team` to `/ueber-uns` (line 25)
- Keep as permanent 301 redirect

### 2.4 Update Sitemap

Update [`frontend/app/sitemap.ts`](frontend/app/sitemap.ts):

- Add `routes.about` to `staticEntries` array in `buildStaticEntries()` call (around line 92)
- Set priority to `0.8` and `changeFrequency: 'monthly'` in the static entry
- Note: `buildStaticEntries()` currently doesn't accept priority/changeFrequency - check if we need to modify it or add entry manually

## Implementation Notes

- Follow existing patterns from `datenschutz/page.tsx` and `impressum/page.tsx` for page structure
- Use `` directive at top of page component
- Media handling follows patterns from `AuthorHeader.tsx` and `ArticleCard.tsx`
- Error handling should gracefully degrade with fallback content
