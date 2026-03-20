# Strapi CMS - m10z

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/LucaNerlich/m10z?utm_source=oss&utm_medium=github&utm_campaign=LucaNerlich%2Fm10z&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

## Load Backups

1. Pull Assets
    - `scp -r luca@94.130.75.93:/mnt/data-volume-1/strapi/m10z /Users/nerlich/workspace/luca/m10z/backend/public/remote-uploads`
    - Manually overwrite local upload files with remote ones
    - or use rsync (--dry-run to test)
    - `rsync -avz --progress --partial --timeout=300 -e "ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=3" luca@94.130.75.93:/mnt/data-volume-1/strapi/m10z/ /Users/nerlich/workspace/luca/m10z/backend/public/uploads`
    - `rsync -avz --progress --partial --timeout=300 -e "ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=3" luca@94.130.75.93:/mnt/data-volume-1/strapi/m10z/ /mnt/workspace/luca/m10z/backend/public/uploads`
2. Load Database Dump from Coolify
    - https://coolify.m10z.de/project/sg4k4so4ooo8g4sgwkoccsco/environment/qggo00o4s0gokw0ok4kosswo/database/g8wgkcoogw8w044gsog8oo4g/backups
3. Ingest Database Dump locally using pg-restore
    - `pg_restore -U postgres -c -d m10z pg-dump-m10z-1766918338.dmp`
4. Update Strapi API Token in `/frontend.env.local`

## Migrating from BaseContent (`base` component)

**Critical:** Do **not** start Strapi with a build that **removed** `base` until the backfill has run on that database
while `base` was still part of the schema. Otherwise the admin and API can show empty metadata; fixing that usually
means **restoring the DB** from a backup (see [`docs/RECOVER_BASECONTENT.md`](docs/RECOVER_BASECONTENT.md)).

**Phase A (this repo today):** Article, podcast, and category have **both** the required `base` component (canonical
data) **and** optional duplicate root fields (`title`, `description`, `date`, `cover`, `banner`). Deploy this, run *
*`MIGRATE_FLATTEN_BASE=true`** once (or the optional cron), verify root fields in admin, then remove the env var.

**Phase C (later deploy):** Remove `base` from the three content types, delete `collection-type.base-content`, set root
`title` (etc.) **required** again, remove `base` from frontend populate and merge helpers, and redeploy.

**Recommended (Docker / Coolify):** set environment variable **`MIGRATE_FLATTEN_BASE=true`** on the Strapi service and
deploy or restart. On bootstrap, Strapi runs the migration inside the normal app process (same config and DB as
production). Check logs for `[migrate-flatten-base] Done`, then **remove `MIGRATE_FLATTEN_BASE`** and redeploy so it
does not run on every restart.

**Optional scheduled run:** set **`MIGRATE_FLATTEN_BASE_CRON_ENABLED=true`** and optionally *
*`MIGRATE_FLATTEN_BASE_CRON_RULE`** (cron expression, default `0 5 * * *`). This registers a cron task that runs the
same migration. Disable the env var and redeploy after it has run once, or it will repeat on schedule.

If the schema no longer has `base`, the migration is a no-op.

After the DB schema no longer includes the BaseContent component, run **`pnpm exec strapi ts:generate-types`** so
`types/generated/components.d.ts` matches. If typegen still emits `CollectionTypeBaseContent`, the connected database
still has that component table (e.g. restore from before migration); apply schema sync or migrate first.

## Content Types

- Author
    - slug
- Podcast
    - slug
  - title, description, date, cover, banner (root fields; migrated from former BaseContent component)
    - 1 -> n Authors
    - 1 -> n Categories
    - shownotes (rte)
    - file
    - duration (audio file length in seconds)
- Article
    - slug
  - title, description, date, cover, banner (root fields)
    - content (TBD, dyn zone?)
    - 1 -> n Authors
    - 1 -> 1 Categories
- Category
    - slug
  - title, description, date, cover, banner (root fields)

## Single Type

- podcast-feed
    - BaseFeed (Component)
- article-feed
    - BaseFeed (Component)

## Components

- BaseFeed
    - title
    - description
    - mail
    - cover (image)

## Livecycle

On Podcast Episode crud, call frontend endpoint to invalidate feed xml.
Use secret token via header for this.

## Environment Variables

### STRAPI_API_TOKEN

Required for migration scripts that upload files to Strapi. This is the API token used for authenticating requests to the Strapi upload endpoint.

**Usage:**

The token can be set in a `.env` file in the `backend` directory:
```bash
STRAPI_API_TOKEN=your_token_here
```

Or as an environment variable:
```bash
export STRAPI_API_TOKEN=your_token_here
pnpm migrate:audio
```

The token can be obtained from the Strapi admin panel under Settings > API Tokens.
