---
name: Article and Podcast Detail Page Enhancements
overview: "Implement four enhancements: replace cover images with banner images using 'large' format, add YouTube videos section to articles, add duration display to podcasts, and standardize responsive design across both pages."
todos:
  - id: task1-article-banner
    content: Update article detail page to use 'large' format size for banner images
    status: completed
  - id: task1-podcast-banner
    content: Update podcast detail page to use 'large' format size for banner images
    status: completed
  - id: task2-youtube-section
    content: Add YouTube videos section below article content with proper video ID extraction and rendering
    status: completed
  - id: task2-youtube-styles
    content: Add CSS styles for YouTube section with proper spacing and responsive behavior
    status: completed
    dependencies:
      - task2-youtube-section
  - id: task3-extract-duration-util
    content: Extract formatDuration function to shared utility file (dateFormatters.ts or new file)
    status: completed
  - id: task3-podcast-duration
    content: Add duration display to podcast metadata section using formatDuration utility
    status: completed
    dependencies:
      - task3-extract-duration-util
  - id: task3-update-podcast-card
    content: Update PodcastCard to import formatDuration from utility instead of local function
    status: completed
    dependencies:
      - task3-extract-duration-util
  - id: task4-article-responsive
    content: Standardize responsive design in article detail page CSS (640px breakpoint, padding, spacing)
    status: completed
  - id: task4-podcast-responsive
    content: Standardize responsive design in podcast detail page CSS (640px breakpoint, padding, spacing)
    status: completed
---

# Article and Podcast Detail Page Enhancements

## Overview

This plan implements four enhancements to improve the article and podcast detail pages:

1. Replace cover images with banner images using 'large' format size
2. Add YouTube videos section below article content
3. Add duration display to podcast metadata
4. Standardize responsive design with updated breakpoints and spacing

## Task 1: Replace Cover Images with Banner Images

**Files:**

- `frontend/app/artikel/[slug]/page.tsx`
- `frontend/app/podcasts/[slug]/page.tsx`

**Changes:**

- Both pages already use `pickBannerOrCoverMedia()` which prefers banner over cover
- Change `getOptimalMediaFormat()` call from `'medium'` to `'large'` format size (lines 84 and 90)
- This will use banner images when available, falling back to cover, with larger format size

## Task 2: Add YouTube Videos Section to Articles

**Files:**

- `frontend/app/artikel/[slug]/page.tsx`
- `frontend/app/artikel/[slug]/page.module.css`

**Changes:**

- Import `extractYouTubeVideoId` from `@/src/lib/youtube`
- Import `YoutubeEmbed` component from `@/src/components/YoutubeEmbed`
- Add new section after markdown content (after line 132)
- Iterate through `article.youtube` array (if exists and has items)
- Extract video ID using `extractYouTubeVideoId(youtubeItem.url)` for each item
- Render `YoutubeEmbed` component with extracted video ID and optional title
- Add conditional rendering to skip items where video ID extraction fails
- Add CSS class `.youtubeSection` with:
- 1.5-2rem margin-top spacing from content
- Gap/spacing between multiple videos
- Max-width: 800px to align with article content
- Responsive behavior (full-width on mobile with preserved aspect ratio)

## Task 3: Add Duration Display to Podcast Metadata

**Files:**

- `frontend/app/podcasts/[slug]/page.tsx`
- `frontend/app/podcasts/[slug]/page.module.css`
- `frontend/src/lib/dateFormatters.ts` (or create new utility file)

**Changes:**

- Extract `formatDuration()` function from `PodcastCard.tsx` to a shared utility
- Add `formatDuration(seconds: number): string` to `frontend/src/lib/dateFormatters.ts` (or create `frontend/src/lib/durationFormatters.ts`)
- Import `formatDuration` in podcast detail page
- Add duration display in `.metaRow` section near published date (after line 119)
- Use conditional rendering to check if `episode.duration` exists
- Use `<time>` element for semantic HTML with appropriate className
- Apply consistent styling matching `.publishedDate` (muted color, similar font size)
- Add CSS styling if needed (or reuse existing metaRow styles)

## Task 4: Standardize Responsive Design

**Files:**

- `frontend/app/artikel/[slug]/page.module.css`
- `frontend/app/podcasts/[slug]/page.module.css`

**Changes for both files:**

- Replace `@media (max-width: 768px)` breakpoint with `@media (max-width: 640px)` for mobile
- Add `@media (min-width: 960px)` breakpoint for larger screens if needed
- Add horizontal padding to `.article`/`.episode` container classes:
- 1rem on mobile (640px and below)
- Scale up on larger screens (e.g., 0 on desktop since max-width handles centering)
- Fine-tune title font sizes for mobile readability (already 1.875rem, verify)
- Fine-tune description font sizes for mobile (already 1.125rem, verify)
- Update `.coverImageContainer` spacing on mobile (adjust margins)
- Update `.metaRow` gap to 1rem or 0.75rem on mobile (currently 1.5rem)
- Add responsive font-size adjustments for `.publishedDate` and `.readingTime` if needed
- Add responsive padding adjustments for `.metaRow` border-top spacing
- Ensure metadata sections wrap correctly on narrow screens

**Additional changes for article page:**

- Add responsive adjustments for `.youtubeSection`:
- Full-width on mobile
- Preserve aspect ratio for embedded videos
- Proper spacing adjustments

## Implementation Notes

1. **Banner vs Cover**: The `pickBannerOrCoverMedia()` function already handles banner preference, so no field access changes needed - only format size update.
2. **YouTube Component**: The `YoutubeEmbed` component accepts `videoId` (required), `title` (optional), `width`, and `height` (optional). The component needs responsive styling improvements (there's a TODO comment), but basic functionality exists.
3. **Duration Formatting**: The `formatDuration` function formats seconds as "MM:SS" or "H:MM:SS". Should be extracted to a shared utility for reuse.
4. **Responsive Breakpoints**: Standardizing on 640px for mobile (typical mobile breakpoint) and 960px for larger screens provides better consistency.

## Files to Modify

1. `frontend/app/artikel/[slug]/page.tsx` - Banner format, YouTube section
2. `frontend/app/artikel/[slug]/page.module.css` - Responsive design, YouTube styles
3. `frontend/app/podcasts/[slug]/page.tsx` - Banner format, duration display
4. `frontend/app/podcasts/[slug]/page.module.css` - Responsive design, duration styles