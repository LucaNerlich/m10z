---
name: statistik
description: Refreshes the /statistik dashboard snapshot from the production Strapi MCP server (issue #706).
---

# Statistik snapshot agent

The `/statistik` page (`frontend/app/statistik/page.tsx`) renders a dashboard of every
published article and podcast episode. It does **not** query Strapi at runtime. It reads a
committed YAML snapshot:

```
frontend/public/statistik/snapshot.yaml
```

This agent refreshes that file whenever the numbers should be updated (e.g. once a month,
or after a big release). It is intentionally not part of the frontend build.

## Recommended: GitHub Action

The **Statistik Snapshot** workflow (`.github/workflows/statistik-snapshot.yml`) runs the
generator against production and opens a PR when `snapshot.yaml` changes.

- **Manual:** Actions → Statistik Snapshot → Run workflow
- **Schedule:** 1st of each month at 06:00 UTC

Required repository secrets:

| Secret                         | Purpose                                              |
|--------------------------------|------------------------------------------------------|
| `STRAPI_MCP_ADMIN_TOKEN_PROD`  | Bearer token for `https://cms.m10z.de/mcp`            |
| `PAT`                          | Write token for the PR branch (same as merge-schedule)|

## Alternative: run the generator script locally

The script pulls everything via the Strapi MCP endpoint (`https://cms.m10z.de/mcp`, the same
server as `strapi-prod` in `.cursor/mcp.json`), normalises it, validates it and writes the
YAML deterministically (sorted, minimal fields).

```bash
cd frontend
pnpm run snapshot:statistik -- --dry-run   # summary only, nothing is written
pnpm run snapshot:statistik                # writes public/statistik/snapshot.yaml
pnpm run snapshot:statistik -- --local     # against local Strapi MCP
```

Authentication uses the MCP admin token from the environment. **Never print, log or commit
the token.**

| Variable                       | Purpose                                             |
|--------------------------------|-----------------------------------------------------|
| `STRAPI_MCP_ADMIN_TOKEN_PROD`  | Default token for the prod endpoint                 |
| `STRAPI_MCP_ADMIN_TOKEN_LOCAL` | Default token when `--local` is passed              |
| `STRAPI_MCP_TOKEN`             | Explicit token override                             |
| `STRAPI_MCP_URL`               | Endpoint override (e.g. a staging instance)         |
| `STATISTIK_SNAPSHOT_OUT`       | Output file override (relative to the current dir)  |

## Fallback: use the MCP tools directly

If the script cannot be run (e.g. an agent environment without shell access but with the
`strapi-prod` MCP server), build the same file with the MCP tools:

1. Page through `list_article`, `list_podcast`, `list_author` and `list_category` with
   `{status: 'published', pageSize: 100, page: N}` until a page returns fewer items than
   `pageSize`.
2. Write the snapshot in exactly this shape (version `1`):

   ```yaml
   version: 1
   generatedAt: 2026-01-01T12:00:00.000Z   # ISO 8601, time of the pull
   authors:     [{slug, name}]              # sorted by name (de), then slug
   categories:  [{slug, name}]              # sorted by name (de), then slug
   articles:    [{slug, title, date, wordCount, authors: [slug], categories: [slug]}]
   podcasts:    [{slug, title, date, duration, authors: [slug], categories: [slug]}]
   ```

   - `date` is the content `date` field, falling back to `publishedAt` (ISO 8601).
   - `wordCount` (articles) and `duration` (podcasts, seconds) may be `null`.
   - Relations reference author/category **slugs** (deduplicated, sorted). Drop unknown ones.
   - Articles and podcasts are sorted by `date` ascending, then slug.
3. Validate: `parseStatistikSnapshot` in `frontend/src/lib/statistik/snapshot.ts` is the
   source of truth for the schema. The page renders an empty state if the file is invalid.

Prefer the script: it applies all of the above rules itself.

Keep the snapshot a faithful mirror of prod. Don't remove entries by hand. Outliers that
should not count (currently the 2018 article `pyre`) are listed in `STATISTIK_EXCLUDED` in
`frontend/src/lib/statistik/statistikStats.ts` and filtered out when the page is rendered.

## Review and commit

For Action-created PRs (and local regenerations):

1. `git diff frontend/public/statistik/snapshot.yaml`. Sanity-check that counts only grow,
   and that nothing beyond slugs, names, titles, dates, word counts and durations ended up
   in the file.
2. `cd frontend && pnpm run test:run && pnpm run build` (CI covers this on Action PRs).
3. Optionally, look at local `/statistik` with `pnpm run dev`.
4. Merge / commit only the snapshot file, e.g. `chore(statistik): refresh snapshot`.

The page reads the file on the server (`src/lib/statistik/statistikSource.ts`), so deploying
the new snapshot is all that's needed. No cache invalidation is involved.
