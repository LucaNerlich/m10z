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

## BaseContent → root fields (historical)

Article, podcast, and category now use **root** `title`, `description`, `date`, `cover`, and `banner` only; the old
`collection-type.base-content` component was removed from this codebase after a one-time data copy on each environment.

If you ever start Strapi **without** `base` in the schema against a database that was **never** backfilled while `base`
still existed, the admin/API can show empty metadata — recovery is backup-first; see
[`docs/RECOVER_BASECONTENT.md`](docs/RECOVER_BASECONTENT.md).

After schema changes, run **`pnpm exec strapi ts:generate-types`** so `types/generated/` matches. If your database
still registered the removed BaseContent component, typegen may briefly re-emit it until the DB is migrated; align
`types/generated/components.d.ts` with the component files under `src/components/` before committing.

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
