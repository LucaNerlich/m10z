---
name: Add channel image to article feed
overview: Extend the article feed to fetch and render channel-level images from Strapi, matching the audio feed implementation pattern. This includes updating the Strapi query to populate the image field, updating TypeScript types, and adding RSS 2.0 compliant image rendering with fallback handling.
todos:
  - id: update-populate-query
    content: Update fetchArticleFeedSingle() in articleFeedRouteHandler.ts to populate channel.image explicitly
    status: completed
  - id: update-type-definition
    content: "Add image: StrapiMediaRef field to StrapiArticleFeedSingle channel type"
    status: completed
  - id: add-image-normalization
    content: Add channel image normalization and URL extraction with fallback in generateArticleFeedXml()
    status: completed
    dependencies:
      - update-type-definition
  - id: render-rss-image
    content: Add <image> element to RSS channel header with url, title, and link sub-elements
    status: completed
    dependencies:
      - add-image-normalization
---

# Add Channel Image to Article Feed

## Overview

Extend the article feed to fetch and render channel-level images from Strapi, following the same pattern used in the audio feed implementation.

## Implementation Details

### Task 1: Fetch Channel Image from Strapi

**File: `frontend/src/lib/rss/articleFeedRouteHandler.ts`**Update `fetchArticleFeedSingle()` function (lines 88-92) to explicitly populate the channel image field, matching the pattern from `audioFeedRouteHandler.ts`:

- Replace `populate: '*'` with explicit population structure:
  ```typescript
    populate: {
        channel: {
            populate: ['image'],
        },
    }
  ```

- This matches the pattern used in `audioFeedRouteHandler.ts` lines 99-108

**File: `frontend/src/lib/rss/articlefeed.ts`**Update `StrapiArticleFeedSingle` type definition (lines 25-31) to include the image field:

- Add `image: StrapiMediaRef` to the `channel` object
- Import `StrapiMediaRef` type from `@/src/lib/rss/media` if not already imported
- Follow the exact pattern from `StrapiAudioFeedSingle` type in `audiofeed.ts` lines 30-38

### Task 2: Render Channel Image in RSS XML

**File: `frontend/src/lib/rss/articlefeed.ts`**Update `generateArticleFeedXml()` function to:

1. **Extract and normalize channel image** (similar to `audiofeed.ts` lines 191-194):

- Use `normalizeStrapiMedia()` to normalize `channel.image`
- Use `mediaUrlToAbsolute()` to convert to absolute URL
- Add fallback to default image: `${siteUrl}/static/img/formate/cover/m10z.jpg` (matching audio feed pattern)

2. **Add `<image>` element to channel header** (similar to `audiofeed.ts` lines 91-95):

- Insert the `<image>` element after the `<atom:link>` element (around line 67)
- Include three required RSS 2.0 sub-elements:
    - `<url>`: absolute URL of the channel image
    - `<title>`: channel title (already available)
    - `<link>`: site URL
- Use `escapeXml()` for all text content

3. **Update function signature** (if needed):

- The function already receives `channel` parameter, so no signature changes needed
- Ensure proper handling of optional/missing image (use fallback)

## Code Patterns to Follow

- **Population pattern**: Match `audioFeedRouteHandler.ts` lines 99-108
- **Type definition**: Match `StrapiAudioFeedSingle` in `audiofeed.ts` lines 30-38
- **Image normalization**: Match `audiofeed.ts` lines 191-194
- **RSS image rendering**: Match `audiofeed.ts` lines 91-95
- **Fallback handling**: Use same default image path as audio feed

## Files to Modify

1. `frontend/src/lib/rss/articleFeedRouteHandler.ts` - Update populate query
2. `frontend/src/lib/rss/articlefeed.ts` - Update type and add image rendering

## Testing Considerations

- Verify RSS feed validates against RSS 2.0 spec
- Test with channel image configured in Strapi
- Test fallback behavior when channel image is missing