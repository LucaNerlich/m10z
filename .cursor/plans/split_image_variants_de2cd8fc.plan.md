---
name: Split_Image_Variants
overview: Add gallery-aware and plain image variants and route existing Image component based on allowed hostnames.
todos:
  - id: review-current-image
    content: Review existing Image + SafeImage whitelist logic
    status: completed
  - id: add-gallery-component
    content: Create GalleryImage with fancybox-ready anchor
    status: completed
    dependencies:
      - review-current-image
  - id: add-plain-component
    content: Create PlainImage wrapping SafeImage
    status: completed
    dependencies:
      - review-current-image
  - id: route-image-component
    content: Update Image to choose Gallery vs Plain via whitelist
    status: completed
    dependencies:
      - add-gallery-component
      - add-plain-component
---

# Split markdown images into gallery vs plain

- Inspect existing markdown image behavior in [`frontend/src/components/markdown/Image.tsx`](frontend/src/components/markdown/Image.tsx) and reuse SafeImage/whitelist logic from [`frontend/src/lib/imageUtils.ts`](frontend/src/lib/imageUtils.ts).
- Add [`frontend/src/components/markdown/GalleryImage.tsx`](frontend/src/components/markdown/GalleryImage.tsx) that wraps SafeImage in a Fancybox-compatible anchor (`data-fancybox="article-gallery"`) with pointer/touch styles and no custom handlers.
- Add [`frontend/src/components/markdown/PlainImage.tsx`](frontend/src/components/markdown/PlainImage.tsx) rendering a simple SafeImage without Fancybox attributes.
- Update [`frontend/src/components/markdown/Image.tsx`](frontend/src/components/markdown/Image.tsx) to detect authorized hostnames (using the same whitelist helper/constants) and render GalleryImage for allowed domains, PlainImage otherwise. FancyboxClient stays unchanged.