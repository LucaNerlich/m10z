# Strapi CMS - m10z

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/LucaNerlich/m10z?utm_source=oss&utm_medium=github&utm_campaign=LucaNerlich%2Fm10z&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

## Load Backups

1. Pull Assets
    - `scp -r luca@94.130.75.93:/mnt/data-volume-1/strapi/m10z /Users/nerlich/workspace/luca/m10z/backend/public/remote-uploads`
    - Manually overwrite local upload files with remote ones
    - or use rsync (--dry-run to test)
    - `rsync -avz --progress --partial --timeout=300 -e "ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=3" luca@94.130.75.93:/mnt/data-volume-1/strapi/m10z/ /Users/nerlich/workspace/luca/m10z/backend/public/uploads`
2. Load Database Dump from Coolify
    - https://coolify.m10z.de/project/sg4k4so4ooo8g4sgwkoccsco/environment/qggo00o4s0gokw0ok4kosswo/database/g8wgkcoogw8w044gsog8oo4g/backups
3. Ingest Database Dump locally using pg-restore
    - `pg_restore -U postgres -c -d m10z pg-dump-m10z-1766918338.dmp`
4. Update Strapi API Token in `/frontend.env.local`

## Content Types

- Author
    - slug
    - BaseContent (Component)
- Podcast
    - slug
    - BaseContent (Component)
    - 1 -> n Authors
    - 1 -> n Categories
    - shownotes (rte)
    - file
    - duration (audio file length in seconds)
- Article
    - slug
    - BaseContent (Component)
    - content (TBD, dyn zone?)
    - 1 -> n Authors
    - 1 -> 1 Categories
- Category
    - slug
    - BaseContent (Component)

## Single Type

- podcast-feed
    - BaseFeed (Component)
- article-feed
    - BaseFeed (Component)

## Components

- BaseContent
    - title
    - description (teaser-text)
    - cover (image)
    - banner (image)
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
