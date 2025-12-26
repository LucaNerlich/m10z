---
name: Fallback image support for detail pages
overview: Add fallback image support using placeholderCover (m10z.jpg) for article and podcast detail pages when banner or cover media is missing. Both pages will use identical fallback logic with 400x225 dimensions and blur placeholder effect.
todos: []
---

# Fallback Image Support for Article and Podcast Detail Pages

## Overview

Implement fallback image support for both article and podcast detail pages when banner or cover media is missing. Use the existing placeholder image (`m10z.jpg`) with 400x225 dimensions and blur placeholder effect.

## Implementation Details

### Files to Modify

1. **[frontend/app/artikel/[slug]/page.tsx](frontend/app/artikel/[slug]/page.tsx)**

- Import `placeholderCover` from `@/public/images/m10z.jpg` (line 12)
- After `pickBannerOrCoverMedia()` call (line 91), check if `bannerOrCoverMedia` is undefined
- When undefined, construct fallback configuration:
    - Use `placeholderCover` as the image source
    - Set dimensions to 400x225 (16:9 aspect ratio)
    - Use blur placeholder effect
- Update `ContentImage` props (lines 104-109) to use fallback values when `optimizedMedia` is unavailable

2. **[frontend/app/podcasts/[slug]/page.tsx](frontend/app/podcasts/[slug]/page.tsx)**

- Import `placeholderCover` from `@/public/images/m10z.jpg` (after line 11)
- After `pickBannerOrCoverMedia()` call (line 98), check if `bannerOrCoverMedia` is undefined
- When undefined, construct fallback configuration identical to article page:
    - Use `placeholderCover` as the image source
    - Set dimensions to 400x225
    - Use blur placeholder effect
- Update `ContentImage` props (lines 111-116) to use fallback values when `optimizedMedia` is unavailable

3. **[frontend/src/components/ContentImage.tsx](frontend/src/components/ContentImage.tsx)**

- Add optional `placeholder` prop to `CoverImageProps` type (default: `'empty'`)
- Pass `placeholder` prop to Next.js `Image` component
- Remove the early return that prevents rendering when props are missing (line 24-26), as pages will now always provide valid fallback values

### Implementation Pattern

Both pages will follow this pattern:

```typescript
const bannerOrCoverMedia = pickBannerOrCoverMedia(...);
const optimizedMedia = bannerOrCoverMedia ? getOptimalMediaFormat(bannerOrCoverMedia, 'large') : undefined;

// Fallback configuration
const fallbackSrc = placeholderCover;
const fallbackWidth = 400;
const fallbackHeight = 225;

// Determine final values
const imageSrc = optimizedMedia ? mediaUrlToAbsolute({media: optimizedMedia}) : fallbackSrc;
const imageWidth = optimizedMedia?.width ?? fallbackWidth;
const imageHeight = optimizedMedia?.height ?? fallbackHeight;
const placeholder = optimizedMedia ? 'empty' : 'blur';

// Render ContentImage with determined values
<ContentImage
    src={imageSrc}
    alt={...}
    width={imageWidth}
    height={imageHeight}
    placeholder={placeholder}
/>
```



### Key Points

- Both pages handle missing images identically
- Fallback uses 400x225 dimensions (16:9 aspect ratio, matching existing card components)
- Blur placeholder effect applied only for fallback images