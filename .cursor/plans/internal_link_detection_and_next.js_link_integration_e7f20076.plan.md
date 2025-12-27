---
name: Internal Link Detection and Next.js Link Integration
overview: Add a link detection utility to distinguish internal from external links, then extend the Markdown renderer to use Next.js Link component for all links while adding security attributes for external links.
todos:
  - id: add-is-internal-link-utility
    content: Add isInternalLink function to routes.ts that checks for relative paths, anchor links, protocol links, and SITE_URL domain matching
    status: completed
  - id: add-markdown-link-component
    content: Add custom a component to Markdown.tsx that uses Next.js Link for all links, conditionally adding target and rel attributes for external links
    status: completed
    dependencies:
      - add-is-internal-link-utility
  - id: convert-absolute-to-relative
    content: Implement logic to convert absolute SITE_URL domain links to relative paths before passing to Next.js Link component
    status: completed
    dependencies:
      - add-is-internal-link-utility
  - id: add-external-link-security
    content: Add target="_blank" and rel="noopener noreferrer" attributes to external links rendered via Next.js Link
    status: completed
    dependencies:
      - add-markdown-link-component
---

# Internal Link Detection and Next.js Link Integration

## Overview

This plan implements two related features:

1. A utility function to detect internal vs external links
2. Integration of Next.js Link component for all links in the Markdown renderer, with security attributes for external links

## Implementation Details

### Task 1: Link Detection Utility

Add `isInternalLink` function to [`frontend/src/lib/routes.ts`](frontend/src/lib/routes.ts):

- **Input**: URL string
- **Output**: boolean (true for internal, false for external)
- **Logic**:
- Return `true` if URL starts with `/` (relative internal path)
- Return `false` if URL starts with `#` (anchor link - should use default browser behavior)
- Return `false` for protocol-specific links (`mailto:`, `tel:`, `http://`, `https://` that don't match SITE_URL)
- For absolute URLs starting with `http://` or `https://`:
- Extract domain from URL
- Compare with `SITE_URL` domain (normalize both by removing protocol and trailing slashes)
- Return `true` if domains match, `false` otherwise
- Leverage existing `SITE_URL` constant and domain extraction logic similar to `absoluteRoute()`

**Edge cases to handle**:

- Empty or invalid URLs → treat as external
- URLs with query parameters or hash fragments → preserve them
- Protocol-relative URLs (`//example.com`) → treat as external

### Task 2: Markdown Link Component

Extend [`frontend/src/lib/markdown/Markdown.tsx`](frontend/src/lib/markdown/Markdown.tsx) to add custom anchor rendering:

- **Imports**: Add `Link` from `next/link` and `isInternalLink` from `@/src/lib/routes`
- **Custom `a` component**: Add alongside existing `h1` and `img` mappings in the `components` prop
- **Component logic**:

1. Extract `href` and all other props (including `className`, `aria-*`, `target`, `rel`, etc.)
2. Call `isInternalLink(href)` to determine link type
3. **Convert absolute SITE_URL links to relative paths**:

- If `href` starts with `SITE_URL`, remove the domain portion
- Preserve path, query params, and hash fragments
- Use the relative path for the Link component

4. **Render with Next.js Link for all links**:

- Use `<Link href={processedHref}>` component for all links (Next.js Link handles external URLs correctly)
- Forward `className` and all accessibility attributes (`aria-*`, `id`, etc.)

5. **Add security attributes for external links**:

- Check if link is external using `isInternalLink(href)`
- Check if link is an anchor link (`href.startsWith('#')`)
- If external AND NOT an anchor link, add `target="_blank"` and `rel="noopener noreferrer"` props
- Anchor links should NOT get `target="_blank"` (preserve default browser scroll behavior)
- These props will be passed through to the underlying `<a>` tag that Next.js Link renders

**Props forwarding strategy**:

- All links: Use Next.js `<Link>` component
- Forward `className`, `aria-*`, `id`, and other accessibility attributes
- Conditionally add `target` and `rel` for external links only (exclude anchor links which start with `#`)
- Use TypeScript to properly type the component props from ReactMarkdown

**Note**: Since `rehype-external-links` adds `target` and `rel` attributes, we need to ensure our custom component overrides these appropriately. The plugin runs before our component, so we'll receive those props and can conditionally apply them.

## Files to Modify

1. [`frontend/src/lib/routes.ts`](frontend/src/lib/routes.ts) - Add `isInternalLink` export
2. [`frontend/src/lib/markdown/Markdown.tsx`](frontend/src/lib/markdown/Markdown.tsx) - Add custom `a` component mapping

## Testing Considerations

- Test with relative paths (`/artikel/test`) - should use Next.js Link without target/rel
- Test with absolute SITE_URL paths (`https://m10z.de/artikel/test`) - should convert to relative and use Next.js Link
- Test with external domains (`https://example.com`) - should use Next.js Link with target="_blank" and rel="noopener noreferrer"
- Test with anchor links (`#section`) - should use Next.js Link without target="_blank" (preserve scroll behavior)
- Test with protocol links (`mailto:`, `tel:`) - should use Next.js Link with target="_blank" and rel
- Test with query params and hash fragments - should preserve them in the href
- Verify Next.js Link is used for all links (check rendered HTML)