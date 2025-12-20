# Strapi CMS - m10z

## Content Types

- Author
    - BaseContent (Component)
- Podcast
    - BaseContent (Component)
    - 1 -> n Authors
    - 1 -> n Categories
    - shownotes (rte)
    - file
- Article
    - BaseContent (Component)
    - content (TBD, dyn zone?)
    - 1 -> n Authors
    - 1 -> 1 Categories
- Category
    - BaseContent (Component)

## Single Type

- podcast-feed
    - BaseFeed (Component)
- article-feed
    - BaseFeed (Component)

## Components

- BaseContent
    - title
    - slug
    - description
    - cover (image)
    - banner (image)
- BaseFeed
    - title
    - description
    - mail
    - cover (image)
