---
name: strapi-media-caption-alt
overview: Fetch Strapi captions and plumb alternativeText/caption into image components and callers.
todos:
  - id: update-media-fields
    content: Add caption to MEDIA_FIELDS and cover/banner field selections
    status: completed
  - id: enhance-image-components
    content: Add caption/title support to GalleryImage and ContentImage
    status: completed
  - id: update-call-sites
    content: Pass alt/title metadata at HomePage/detail/cards/markdown flows
    status: completed
    dependencies:
      - enhance-image-components
  - id: verify-metadata
    content: Re-check metadata formatter and remaining media renderers
    status: completed
    dependencies:
      - update-media-fields
      - update-call-sites
---

# Strapi media captions and alt wiring

1) Update Strapi media fetch fields to include captions in all queries by expanding `MEDIA_FIELDS` and any hard-coded cover/banner field selections in `frontend/src/lib/strapiContent.ts` so captions are available across article/podcast/category fetches.

2) Enhance image components: add optional caption/title support to `GalleryImage` (prop + title/data-caption/aria-label) and to `ContentImage` (optional title passthrough), keeping existing defaults for non-captioned images.

3) Propagate metadata to call sites: adjust feed/home cards, article/podcast detail, category cards, and other uses of `ContentImage` to pass `alternativeText` for `alt` and `caption` for `title`; ensure markdown `Image`/`GalleryImage` flow forwards captions when present while preserving plain image behavior.

4) Verify formatting/metadata helpers (e.g., `frontend/src/lib/metadata/formatters.ts`) continue using `alternativeText`/`caption` correctly and audit remaining Strapi media renderers for consistent alt/title usage.