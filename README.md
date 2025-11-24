# M10Z - Mindestens 10 Zeichen

**M10Z** (*Mindestens 10 Zeichen*, German for "At least 10 characters") is a German gaming and technology blog platform built with modern web technologies. It serves as the digital home for multiple podcast formats, in-depth articles, game reviews, and tech discussions from a passionate community of content creators.

![M10Z Logo](./static/img/M10Z_Orange.png)

## Features

### 📻 Multi-Format Podcast Platform
- **10+ unique podcast formats** covering various gaming and tech topics
- **Automated audio feed generation** for seamless podcast distribution
- **Individual show branding** with custom cover art and banners
- **Community integration** with forum discussions for each episode

### 📝 Rich Content Management
- **Multi-category blog system** (articles, reviews, tech posts, brief bookmarks)
- **Author management system** with detailed profiles and social links
- **Automated content generation** and organization
- **German-language focused** with localized content and navigation

### 🎨 Modern Web Experience
- **Progressive Web App (PWA)** with offline capabilities
- **Dark/light theme support** with user preference detection
- **Responsive design** optimized for all devices
- **Advanced search functionality** with local indexing
- **Image optimization** with multiple resolution support

### 🚀 Developer-Friendly Architecture
- **TypeScript** throughout the codebase
- **Docker containerization** for easy deployment
- **Modular component system** with reusable UI elements
- **Automated build and deployment** workflows
- **Comprehensive content templating**

## 🏗️ Tech Stack

- **Frontend Framework**: [Docusaurus 3](https://docusaurus.io/) with React 19
- **Language**: TypeScript
- **Styling**: CSS Modules + Sass support
- **Content**: MDX (Markdown + JSX components)
- **Analytics**: Umami integration
- **Audio**: React Player for embedded content
- **Search**: Local search with multi-language support
- **Deployment**: Docker with multi-stage builds

## 📁 Project Structure

```
m10z/
├── blog/                          # Content directory
│   ├── articles/                  # Blog articles by category
│   │   ├── announcement/          # Site announcements
│   │   ├── briefbookmarks/        # Quick links and recommendations
│   │   ├── experience/            # Personal gaming experiences
│   │   ├── kommentare/            # Opinion pieces and commentary
│   │   ├── reviews/               # Game and tech reviews
│   │   ├── tech/                  # Technical articles and tutorials
│   │   └── ...
│   ├── podcasts/                  # Podcast episodes by show
│   │   ├── m10z/                  # Main M10Z podcast
│   │   ├── fundbuero/             # "Fundbüro" - forgotten games
│   │   ├── owwg/                  # "Once we were Gamers"
│   │   ├── dgpgp/                 # "Des GamePasses Geheime Perlen"
│   │   ├── en-rogue/              # Roguelike-focused discussions
│   │   ├── telespiel-trio/        # Gaming review trio
│   │   └── ...
│   └── authors.yml                # Author profiles and metadata
├── src/
│   ├── components/                # Custom React components
│   ├── pages/                     # Static pages
│   ├── styles/                    # Global styles
│   └── types/                     # TypeScript definitions
├── static/                        # Static assets
│   ├── img/                       # Images and media
│   └── audiofeed.xml              # Generated podcast feed
├── templates/                     # Content templates
├── generateAudioFeed.js           # Podcast feed generator
├── generateAuthorsJson.js         # Author data processor
└── docusaurus.config.js           # Site configuration
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 22+ 
- **npm** 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/LucaNerlich/m10z.git
cd m10z

# Install dependencies
npm install

# Generate required content files
npm run generate

# Start development server
npm run dev
```

The site will be available at `http://localhost:3000`

### Development Commands

```bash
# Development with content generation
npm run dev

# Start without generation (faster for development)
npm run start

# Build for production
npm run build

# Serve production build
npm run serve

# Generate content only
npm run generate

# Type checking
npm run typecheck

# Clear Docusaurus cache
npm run clear
```

## 🎙️ Podcast Formats

M10Z hosts multiple podcast formats, each with its unique focus and style:

### 🎯 Core Shows
- **M10Z Podcast** - Main gaming discussion format
- **Fundbüro** - Exploring forgotten and vintage games
- **Once we were Gamers** - Gaming discussions for busy adults
- **Des GamePasses Geheime Perlen** - Hidden Game Pass gems
- **En Rogue** - Roguelike and roguelite game focus

### 🎨 Specialized Content
- **Das Telespiel-Trio** - Three-person game reviews with scoring
- **Comic Cast** - Comic book discussions and reviews
- **Fantastische Fakten** - Fascinating gaming trivia
- **Pixelplausch** - Casual gaming and tech conversations
- **Zocken ohne Zaster** - Budget gaming recommendations

### 📚 Audio Content
- **Das gesprochene Wort** - Audio readings of community texts
- **Spezial** episodes - Deep-dive discussions on current topics

## ✍️ Content Creation

### Adding a New Podcast Episode

1. **Create the episode file** in the appropriate podcast directory:
```bash
blog/podcasts/[format-name]/YYYY-MM-DD-episode-title.mdx
```

2. **Use the episode template**:
```mdx
---
slug: episode-slug
title: 'Episode Title'
authors: [author1, author2]
tags: [podcast, format-name, author1, author2]
image: /img/formate/banner/format-banner.jpg
date: YYYY-MM-DD
draft: false
---

import Image from '@theme/IdealImage'
import ReactPlayer from 'react-player'

Episode description and show notes...

<Image style={{width: '100%'}} img={require('/static/img/formate/banner/format-banner.jpg')} />

<!--truncate-->

Full episode content...

<ReactPlayer
    width="100%"
    height="50px"
    controls
    src='https://your-audio-host.com/episode.mp3'
/>
```

#### Adding Episodes to the RSS Feed

To include new episodes in the podcast RSS feed, you must update the `static/audiofeed.yaml` file:

3. **Add episode entry to audiofeed.yaml** at the top of the file (newest episodes first):
```yaml
- title: 'Episode Title'
  date: YYYY-MM-DDTHH:MM
  image: https://raw.githubusercontent.com/LucaNerlich/m10z/main/static/img/formate/cover/format-cover.jpg
  description: |2-
                Episode description with HTML formatting allowed.
                
                Multiple paragraphs and <a href="link">HTML links</a> are supported.
                Use proper indentation for multi-line descriptions.
  seconds: 3600  # Duration in seconds OR "01:00:00" format
  blogpost: https://m10z.de/episode-slug
  url: https://your-audio-host.com/episode.mp3
```

**Important notes for audiofeed.yaml:**
- **Order matters**: Add new episodes at the **top** of the file
- **Date format**: Use ISO format `YYYY-MM-DDTHH:MM` (e.g., `2024-12-24T09:00`)
- **Image URLs**: Use the full GitHub raw URL for cover images
- **Description formatting**: Use `|2-` for multi-line descriptions with proper indentation
- **Duration format**: Either seconds as number (`3600`) or time format (`"01:00:00"`)
- **Blogpost URL**: Must match the deployed site URL structure

4. **Regenerate the feed** by running:
```bash
npm run generateAudioFeed
```

This will create/update the `static/audiofeed.xml` file that podcast clients consume.

### Adding a New Article

1. **Choose the appropriate category** under `blog/articles/`
2. **Create the article file**:
```bash
blog/articles/[category]/YYYY-MM-DD-article-title.mdx
```

3. **Follow the article template** with proper frontmatter and content structure

### Adding New Authors

Add author information to `blog/authors.yml`:

```yaml
authorid:
  page: true
  description: Author bio and description
  image_url: https://example.com/avatar.jpg
  name: Display Name
  url: /tags/authorid
  socials:
    bluesky: https://bsky.app/profile/username
    github: https://github.com/username
    homepage: https://example.com
```

## 🔧 Configuration

### Site Configuration
The main configuration is in `docusaurus.config.js`:

- **Site metadata** (title, tagline, URL)
- **Theme configuration** (navbar, footer, colors)
- **Plugin settings** (search, PWA, analytics)
- **Content organization** (blog settings, pagination)

### Audio Feed Generation
The `generateAudioFeed.js` script:
- **Processes podcast episodes** from the blog structure
- **Generates RSS/XML feeds** for podcast clients
- **Handles metadata** like duration, file size, and descriptions
- **Caches file information** for performance

### Author Management
The `generateAuthorsJson.js` script:
- **Converts YAML to JSON** for runtime use
- **Validates author data** structure
- **Generates author pages** and tag links

## 🐳 Docker Deployment

### Build and Run

```bash
# Build the Docker image
docker build -t m10z .

# Run the container
docker run -p 3000:3000 m10z
```

### Multi-stage Build
The Dockerfile uses a two-stage build:

1. **Build stage**: Installs dependencies, generates content, builds the site
2. **Production stage**: Creates a minimal runtime image with only necessary files

### Environment Variables

```bash
PORT=3000              # Server port
NODE_ENV=production    # Environment mode
```

## 🌐 Community Integration

### Forum Integration
- **Community discussions** linked to each episode
- **Forum threads** automatically referenced in content
- **User engagement** through comment systems

### Social Media
- **Multiple platform support** (Bluesky, Instagram, GitHub, etc.)
- **Automated social sharing** with proper metadata
- **Community Discord** for real-time discussions

### Interactive Features
- **Gaming events** like "Spiele-Wichteln" (Game Exchange)
- **Community polls and voting**
- **User-generated content** integration

## 📊 Analytics and Performance

### Built-in Analytics
- **Umami integration** for privacy-focused analytics
- **PWA metrics** for app-like usage tracking
- **Search analytics** for content discovery insights

### Performance Optimizations
- **Image optimization** with responsive loading
- **Code splitting** for faster initial loads
- **Service worker** for offline functionality
- **Optimized builds** with Docusaurus Fast mode support

## 🎨 Branding and Media

### Visual Identity
- **Orange color scheme** (`#F16012`) as primary brand color
- **Custom logo variations** for different contexts
- **Format-specific branding** for each podcast show
- **Consistent visual language** across all content

### Media Assets
- **Cover art** for all podcast formats
- **Banner images** for promotional content
- **Author avatars** and profile images
- **Article illustrations** and screenshots

## 🤝 Contributing

### Content Guidelines
1. **Follow naming conventions** for files and slugs
2. **Use proper frontmatter** with all required fields
3. **Include appropriate tags** for discoverability
4. **Optimize images** before adding to static assets
5. **Test locally** before submitting changes

### Development Guidelines
1. **Follow TypeScript** best practices
2. **Maintain component modularity**
3. **Document new features** and changes
4. **Ensure mobile compatibility**
5. **Test build process** with Docker

### Community Standards
- **German language** preferred for content
- **Gaming and tech focus** maintained
- **Respectful discourse** in all interactions
- **Quality over quantity** in content creation

## 📄 License

This project is open source and available under the terms specified in the LICENSE file.

## 🔗 Links

- **Website**: [m10z.de](https://m10z.de)
- **Community Forum**: [community.wasted.de](https://forum.m10z.de)
- **Discord**: [Join our Discord](https://discord.gg/G5ngm7S6wF)
- **Linktree**: [linktr.ee/m10z](https://linktr.ee/m10z)
- **Twitch**: [twitch.tv/m10z_tv](https://www.twitch.tv/m10z_tv)
- **YouTube**: [M10Z_TV](https://www.youtube.com/@M10Z_TV)

---

**M10Z** - Where gaming meets community, and every character counts. 🎮✨
