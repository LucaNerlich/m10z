---
name: media-index
description: Refreshes frontend/public/media-index.json from the production Strapi MCP so inline Markdown images render with Media Library alt text, captions and blur placeholders.
---

# Media index agent

Inline images embedded in article/podcast `content` are plain Markdown
(`![filename](https://cms.m10z.de/uploads/…)`) — they are **not** relations, so
the frontend never sees their Media Library `alternativeText`/`caption`. The
media index closes that gap: it maps a media URL to its metadata, and the
Markdown renderer applies it (`src/lib/media/mediaIndex.ts`,
`src/lib/markdown/Markdown.tsx`). Besides alt text and caption, entries carry
the precomputed blur placeholder (`blurhash`, a `data:image/…` URL from the
Media Library) so inline images fade in like cover images instead of popping
in.

The index is a committed snapshot:

```
frontend/public/media-index.json
```

It is intentionally **not** generated during the frontend build.

## Recommended: GitHub Action

The **Media Index** workflow (`.github/workflows/media-index.yml`) regenerates
the file against production and commits it to `main` when it changes.

- **Manual:** Actions → Media Index → Run workflow
- **Schedule:** every Monday at 03:00 UTC

Required repository secrets:

| Secret                        | Purpose                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| `STRAPI_MCP_ADMIN_TOKEN_PROD` | Bearer token for `https://cms.m10z.de/mcp`                 |
| `PAT`                         | Shared write token for pushing to `main` |

## Alternative: run the generator locally

The script pages `media_list_assets` over the Strapi MCP endpoint, fetches the
upload blur placeholders from the public upload content API
(`/api/upload/files`), and writes the snapshot deterministically (sorted, only
assets that carry an alt text, caption or blurhash).

```bash
cd frontend
pnpm run media:index -- --dry-run   # summary only, nothing written
pnpm run media:index                # writes public/media-index.json
pnpm run media:index -- --local     # against local Strapi MCP
```

| Variable                       | Purpose                                            |
| ------------------------------ | -------------------------------------------------- |
| `STRAPI_MCP_ADMIN_TOKEN_PROD`  | Default token for the prod endpoint                |
| `STRAPI_MCP_ADMIN_TOKEN_LOCAL` | Default token when `--local` is passed             |
| `STRAPI_MCP_TOKEN`             | Explicit token override                            |
| `STRAPI_MCP_URL`               | Endpoint override (e.g. a staging instance)        |
| `MEDIA_INDEX_OUT`              | Output file override (relative to the current dir) |

Never print, log or commit the token.

## When to refresh

Run it after Media Library metadata changes — most commonly right after the
caption pipeline in `backend/`:

```bash
cd backend  && pnpm caption:images -- --apply   # write alt/caption via MCP
cd frontend && pnpm media:index                 # mirror it into the index
git add frontend/public/media-index.json && git commit -m 'chore(media): refresh media index'
```

The index is a deploy artifact: the site only picks up new text after it is
committed and deployed (the scheduled Action does this once a week).

## Behaviour

- The Media Library **wins** when it has a value; otherwise the authored
  Markdown text is kept.
- Only assets sharing the index's `baseUrl` origin are matched, so an
  externally hosted image cannot inherit a Media Library entry by pathname.
- Images inside fenced code blocks are left untouched, and the transform is
  idempotent.
- Assets without alt text, without a caption **and** without a blurhash are
  omitted, so the file only grows with usable metadata.

## Limitations

- Scope is the **website** renderer. The RSS feeds (`articlefeed`/`audiofeed`)
  convert Markdown separately and use their own golden-snapshot pipeline
  (`frontend/scripts/feed-snapshot.ts`); enriching them needs a coordinated
  change there.
- Raw `<img>` tags inside content are not enriched — only Markdown image syntax.
