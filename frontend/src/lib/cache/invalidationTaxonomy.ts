import {routes} from '@/src/lib/routes';

export type InvalidationTarget =
    | 'article'
    | 'podcast'
    | 'category'
    | 'author'
    | 'about'
    | 'legal'
    | 'sitemap'
    | 'search-index'
    | 'articlefeed'
    | 'audiofeed';

export type Revalidations = {
    readonly tags: readonly string[];
    readonly pages: readonly string[];
    readonly paths: readonly string[];
};

export const INVALIDATION_TAXONOMY: Record<InvalidationTarget, Revalidations> = {
    article: {
        tags: ['strapi:article', 'strapi:article:list', 'related-content', 'page:home'],
        pages: [routes.articles, `${routes.articles}/[slug]`, routes.home],
        paths: [],
    },
    podcast: {
        tags: ['strapi:podcast', 'strapi:podcast:list', 'related-content', 'page:home'],
        pages: [routes.podcasts, `${routes.podcasts}/[slug]`, routes.home],
        paths: [],
    },
    category: {
        tags: [
            'strapi:category',
            'strapi:category:list',
            'strapi:article',
            'strapi:article:list',
            'strapi:podcast',
            'strapi:podcast:list',
        ],
        pages: [
            routes.categories,
            `${routes.categories}/[slug]`,
            routes.articles,
            routes.podcasts,
            routes.home,
        ],
        paths: [],
    },
    author: {
        tags: [
            'strapi:author',
            'strapi:author:list',
            'strapi:article',
            'strapi:article:list',
            'strapi:podcast',
            'strapi:podcast:list',
        ],
        pages: [
            routes.articles,
            `${routes.articles}/[slug]`,
            routes.podcasts,
            `${routes.podcasts}/[slug]`,
            `${routes.authors}/[slug]`,
            routes.home,
        ],
        paths: [],
    },
    about: {
        tags: ['about', 'strapi:about'],
        pages: [routes.about],
        paths: [],
    },
    legal: {
        tags: ['legal', 'imprint', 'privacy'],
        pages: [],
        paths: [routes.imprint, routes.privacy],
    },
    sitemap: {
        tags: [
            'sitemap:articles',
            'sitemap:podcasts',
            'sitemap:authors',
            'sitemap:categories',
        ],
        pages: [],
        paths: ['/sitemap.xml', '/sitemap'],
    },
    'search-index': {
        tags: ['search-index'],
        pages: [],
        paths: [],
    },
    articlefeed: {
        tags: [
            'feed:article',
            'strapi:article-feed',
            'strapi:article',
            'strapi:article:list',
            'related-content',
            'strapi:category',
            'strapi:category:list',
            'page:home',
        ],
        pages: [
            routes.home,
            routes.articles,
            `${routes.articles}/[slug]`,
            routes.categories,
            `${routes.categories}/[slug]`,
        ],
        paths: [routes.articleFeed],
    },
    audiofeed: {
        tags: [
            'feed:audio',
            'strapi:audio-feed',
            'strapi:podcast',
            'strapi:podcast:list',
            'related-content',
            'strapi:category',
            'strapi:category:list',
            'page:home',
        ],
        pages: [
            routes.home,
            routes.podcasts,
            `${routes.podcasts}/[slug]`,
            routes.categories,
            `${routes.categories}/[slug]`,
        ],
        paths: [routes.audioFeed],
    },
};

export function isInvalidationTarget(value: string): value is InvalidationTarget {
    return value in INVALIDATION_TAXONOMY;
}
