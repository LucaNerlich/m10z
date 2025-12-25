# NextJS Frontend - m10z

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/LucaNerlich/m10z?utm_source=oss&utm_medium=github&utm_campaign=LucaNerlich%2Fm10z&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

## Routes

### Content Pages

- / - Home (Showing latest articles and podcasts (episodes))
- /artikel - Article Dashboard / List
- /artikel/[slug] - Article Detail Page
- /podcasts - Podcast Episodes Dashboard / List
- /podcasts/[slug] - Podcast Detail Page
- /kategorien - Category List
- /kategorien/[slug] - Category Detail Page
- /team - team page + m10z introduction

### Feed Endpoints
https://nextjs.org/docs/app/api-reference/file-conventions/route#non-ui-responses

- /rss.xml - returns an article rss feed as xml
- /audiofeed.xml - returns a podcast rss feed as xml

### Legal Pages

- /impressum - imprint
- /datenschutz - privacy policy

### API Routes

- /api - server-side api endpoints
- /api/audiofeed - generate podcast rss xml feed
- /api/audiofeed/invalidate
- /api/articlefeed - generate article rss xml feed
- /api/articlefeed/invalidate

## Content Parsing

- https://github.com/cure53/DOMPurify
- https://www.npmjs.com/package/react-markdown - supports component overrides

## Layout

### Header

- Home: Logo + Navigation
- Articles
- Podcasts

### Footer

- Impressum
- Datenschutz
- Links
  - Audio Feed
  - Forum
  - Discord
