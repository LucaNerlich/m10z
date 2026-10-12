# Media caption pipeline (issue #724)

`pnpm caption:images` fills missing German `alternativeText` and `caption` values on
Media Library images by feeding each image to a vision model.

It is a manual operator script, not part of the build or a cron job.

## Pipeline

1. **Inventory** — pages `media_list_assets` over the [Strapi MCP server](../../../.cursor/mcp.json)
   (`mime: image`) into a local asset list.
2. **Scope** — default: only raster images whose `alternativeText` **or** `caption` is empty.
   `--force` widens it to every image.
3. **Analyse** — downloads each image, downscales it to 768 px JPEG, and sends a small batch
   to the opencode go gateway (`opencode-go/deepseek-v4.1-flash` by default) asking for strict
   JSON. Batches that are truncated or unparseable are split and retried; single-image failures
   are reported, never fatal.
4. **Dry run (default)** — prints `id | name | current → proposed` plus a token/cost summary and
   writes nothing.
5. **Apply** — `media_update_asset` per asset, filling **only** blank fields. `--force` also
   overwrites existing text.

## Prerequisites

- Strapi MCP enabled (`STRAPI_MCP_ENABLED=true`) with an Admin token that grants
  `plugin::upload.read` and `plugin::upload.assets.update` (Strapi ≥ 5.54).
- An opencode go key: either `OPENCODE_GO_API_KEY` in the environment or a signed-in
  opencode CLI (the script falls back to `~/.local/share/opencode/auth.json`).

## Usage

```bash
cd backend
pnpm caption:images                      # dry run, missing alt/caption only
pnpm caption:images -- --limit 10        # cap the run
pnpm caption:images -- --local           # against http://localhost:1337/mcp
pnpm caption:images -- --out manifest.json
pnpm caption:images -- --apply           # write the proposals
pnpm caption:images -- --apply --force   # refresh every image
```

### Flags

| Flag              | Default                           | Meaning                                                             |
| ----------------- | --------------------------------- | ------------------------------------------------------------------- |
| `--apply`         | off                               | Write the proposals. Without it the run is a dry run.               |
| `--dry-run`       | on                                | Explicitly forces a dry run (overrides a previous `--apply`).       |
| `--force`         | off                               | Ignore scope: process every image and overwrite existing text.      |
| `--local`         | off                               | Use `http://localhost:1337/mcp` and `STRAPI_MCP_ADMIN_TOKEN_LOCAL`. |
| `--limit N`       | –                                 | Process at most `N` images.                                         |
| `--model ID`      | `opencode-go/deepseek-v4.1-flash` | Model id (opencode provider form).                                  |
| `--batch-size N`  | `4`                               | Images per model request.                                           |
| `--page-size N`   | `100`                             | MCP page size (max 100).                                            |
| `--concurrency N` | `2`                               | Batches analysed in parallel.                                       |
| `--out FILE`      | –                                 | Write a JSON manifest of all proposals (dry run and apply).         |

### Environment

| Variable                       | Purpose                                           |
| ------------------------------ | ------------------------------------------------- |
| `STRAPI_MCP_ADMIN_TOKEN_PROD`  | Bearer token for `https://cms.m10z.de/mcp`        |
| `STRAPI_MCP_ADMIN_TOKEN_LOCAL` | Bearer token for `--local`                        |
| `STRAPI_MCP_TOKEN`             | Explicit token override                           |
| `STRAPI_MCP_URL`               | Endpoint override (e.g. staging)                  |
| `OPENCODE_GO_API_KEY`          | opencode go key (else the CLI auth store is used) |
| `CAPTION_MODEL`                | Model id override                                 |

Never print, log or commit the tokens.

### Where the values come from

The script calls `dotenv.config()`, which loads `.env` from the **working directory** — `pnpm caption:images` runs with `backend/` as cwd, so `backend/.env` is picked up (no path change is needed now that the script lives in `scripts/media-caption/`). Variables already set in the shell take precedence over `.env`, so the token and opencode key normally come from the shell (the same values used by Cursor in `.cursor/mcp.json`). Running the file directly from the repo root would look for a root `.env` instead — prefer the pnpm script.

## Recommended run order

1. `pnpm caption:images` (prod dry run) — review the proposals.
2. `pnpm caption:images -- --apply --limit 3` — verify the writes in the admin panel.
3. `pnpm caption:images -- --apply` — full run.

## Notes

- Only raster formats are processed; `image/svg+xml` and audio/video assets are skipped.
- Media Library metadata changes do **not** trigger the document cache invalidation pipeline
  (there is no upload `uid` in `shared/strapi-contract/registry.ts`). New alt text/captions
  appear on the site after the relevant cache tag expires (≤ 3600 s) or the next publish —
  they are never stale in the admin panel.
- Re-running is safe: the default scope re-selects anything still missing text, and an
  occasional duplicate write of the same value is harmless.
