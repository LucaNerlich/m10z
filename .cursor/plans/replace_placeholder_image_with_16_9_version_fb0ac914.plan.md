---
name: Replace placeholder image with 16:9 version
overview: Replace the square m10z.jpg placeholder image (3000x3000) with a 16:9 aspect ratio version to match the card container specifications and prevent layout issues when descriptions push content downward.
todos: []
---

# Replace Placeholder Image

with 16:9 Aspect Ratio Version

## Current State

- **Current image**: `frontend/public/images/m10z.jpg` is a square 3000x3000 JPEG (352KB)
- **Card containers**: Use 16:9 aspect ratio via CSS (`aspect-ratio: 16 / 9` in [ContentCard.module.css](frontend/src/components/ContentCard.module.css))
- **Default dimensions**: ArticleCard and PodcastCard use 400x225 (16:9) as fallback dimensions
- **Issue**: Square image in 16:9 container with `object-fit: cover` can cause layout inconsistencies when descriptions are long

## Implementation Steps

### 1. Prepare 16:9 Image

**Option A: Crop existing square image**

- Use image editing software (ImageMagick, Photoshop, GIMP, or online tools)
- Crop the 3000x3000 image to 16:9 aspect ratio (e.g., 3000x1688 or 1920x1080)
- Center the crop to preserve the main visual elements (orange symbol, text)
- Optimize as JPEG with quality ~85-90% to maintain visual quality while keeping file size ≤352KB

**Option B: Letterbox approach**

- Add horizontal padding/letterboxing to maintain full square image
- Create 16:9 canvas (e.g., 1920x1080)
- Center the square image with white/brick-colored background matching the design
- Export as JPEG with appropriate compression

**Recommended dimensions**: 1920x1080 or 1600x900 (both are 16:9)

### 2. Replace Image File

- Replace `frontend/public/images/m10z.jpg` with the prepared 16:9 version
- Verify file permissions match existing assets (`-rw-r--r--`)
- Ensure file size is ≤352KB (or close to original size)

### 3. Verification

**Visual consistency checks:**

- Test ArticleCard component without CMS image (fallback scenario)
- Test PodcastCard component without CMS image (fallback scenario)
- Verify image fills the 16:9 container without gaps or distortion
- Confirm `object-fit: cover` behavior works correctly
- Check blur placeholder effect during initial load
- Verify 16px padding between image and card content remains balanced
- Test on different screen sizes (responsive behavior)

**Components to test:**

- [ArticleCard.tsx](frontend/src/components/ArticleCard.tsx) - uses placeholder at line 10, displays at lines 50-57
- [PodcastCard.tsx](frontend/src/components/PodcastCard.tsx) - uses placeholder at line 10, displays at lines 48-55
- [page.tsx](frontend/app/page.tsx) - also references placeholder at line 14

**Note**: No code changes required - the import statements will automatically reference the updated file since they use `@/public/images/m10z.jpg` path.

## Technical Details

- **CSS**: The `.media` container enforces 16:9 via `aspect-ratio: 16 / 9` (line 20 in ContentCard.module.css)