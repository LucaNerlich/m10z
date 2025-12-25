# Strapi CMS - m10z

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/LucaNerlich/m10z?utm_source=oss&utm_medium=github&utm_campaign=LucaNerlich%2Fm10z&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

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
```bash
export STRAPI_API_TOKEN=your_token_here
pnpm migrate:audio
```

The token can be obtained from the Strapi admin panel under Settings > API Tokens.
