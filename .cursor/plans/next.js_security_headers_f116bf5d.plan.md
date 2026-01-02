---
name: Next.js security headers
overview: Add a production-only `headers()` configuration to Next.js that sets a CSP supporting YouTube embeds and Umami analytics, plus baseline hardening headers.
todos:
  - id: add-headers
    content: Add production-only Next.js `headers()` with CSP directives and complementary security headers
    status: completed
  - id: verify-build
    content: Run frontend checks and do a quick smoke-check for YouTube embeds + Umami in production build
    status: completed
    dependencies:
      - add-headers
---

# Implement security headers in Next.js

## Scope
- Update `[frontend/next.config.ts](/Users/nerlich/workspace/luca/m10z/frontend/next.config.ts)` to add an `async headers()` function.
- Apply headers **only in production** (per your choice), returning `[]` in development.

## Implementation details
- Add `async headers()` to the exported `nextConfig` object.
- Return an array with a single matcher for all routes:
  - `source: '/:path*'`
- Add headers:
  - `Content-Security-Policy`: join the directives you specified into a single-line CSP value:
    - `default-src 'self'`
    - `script-src 'self' https://umami.m10z.de https://www.youtube.com https://s.ytimg.com`
    - `frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com`
    - `img-src 'self' https://i.ytimg.com https://ytimg.com https://cdn.akamai.steamstatic.com https://cms.m10z.de https://image.api.playstation.com`
    - `connect-src 'self' https://umami.m10z.de https://*.googlevideo.com`
    - `media-src 'self' https://*.googlevideo.com`
    - `style-src 'self' 'unsafe-inline'`
    - `font-src 'self'`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: origin-when-cross-origin`
  - `Permissions-Policy`: deny camera/microphone/geolocation and a conservative set of other high-risk APIs (avoiding likely YouTube-breakers like fullscreen / encrypted-media unless you ask for them).

## Verification
- Run the frontend build/typecheck/lint to ensure `next.config.ts` remains valid.
- Quick smoke-check key pages that use YouTube embeds and confirm Umami loads in production build.

## Files to change
- `[frontend/next.config.ts](/Users/nerlich/workspace/luca/m10z/frontend/next.config.ts)`

## Todos
- `add-headers`: Add production-gated `async headers()` with CSP + baseline headers
- `verify-build`: Verify build/lint still passes and key pages render with YouTube + Umami
