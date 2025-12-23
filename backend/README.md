# Strapi CMS - m10z

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
