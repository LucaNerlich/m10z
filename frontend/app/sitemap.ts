import {MetadataRoute} from 'next';

import {absoluteRoute, routes} from '@/src/lib/routes';
import {fetchPublishedSlugs} from '@/src/lib/publishedSlugs';

type SitemapEntry = {slug: string; lastModified?: string};

function createLanguageAlternates(url: string) {
    return {
        languages: {
            de: url,
            'x-default': url,
        },
    };
}

function buildDynamicEntries(
    entries: SitemapEntry[],
    buildPath: (slug: string) => string,
    changeFrequency?: MetadataRoute.Sitemap[number]['changeFrequency'],
    priority?: number,
): MetadataRoute.Sitemap {
    return entries.map(({slug, lastModified}) => {
        const url = absoluteRoute(buildPath(slug));
        return {
            url,
            lastModified,
            changeFrequency,
            priority,
            alternates: createLanguageAlternates(url),
        };
    });
}

function buildStaticEntries(urls: string[]): MetadataRoute.Sitemap {
    return urls.map((url) => {
        const absoluteUrl = absoluteRoute(url);
        return {
            url: absoluteUrl,
            alternates: createLanguageAlternates(absoluteUrl),
        };
    });
}

/**
 * Generate the site's sitemap by combining static routes with published content entries.
 *
 * Includes language alternates, changeFrequency, and priority for each URL.
 *
 * @returns An array of sitemap items containing static routes and dynamic entries for articles, podcasts, categories, and authors
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [articles, podcasts, categories, authors] = await Promise.all([
        fetchPublishedSlugs('articles', ['sitemap:articles', 'strapi:article']),
        fetchPublishedSlugs('podcasts', ['sitemap:podcasts', 'strapi:podcast']),
        fetchPublishedSlugs('categories', ['sitemap:categories']),
        fetchPublishedSlugs('authors', ['sitemap:authors']),
    ]);

    const staticEntries = buildStaticEntries([
        routes.home,
        routes.articles,
        routes.podcasts,
        routes.categories,
        routes.authors,
        routes.m12g,
        routes.feeds,
        routes.audioFeed,
        routes.articleFeed,
        routes.imprint,
        routes.privacy,
        routes.about,
    ]);

    // Assign changeFrequency and priority to static entries by URL
    const staticPriorities: Record<string, {changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number}> = {
        [absoluteRoute(routes.home)]: {changeFrequency: 'daily', priority: 1.0},
        [absoluteRoute(routes.articles)]: {changeFrequency: 'daily', priority: 0.9},
        [absoluteRoute(routes.podcasts)]: {changeFrequency: 'daily', priority: 0.9},
        [absoluteRoute(routes.categories)]: {changeFrequency: 'weekly', priority: 0.6},
        [absoluteRoute(routes.authors)]: {changeFrequency: 'weekly', priority: 0.6},
        [absoluteRoute(routes.m12g)]: {changeFrequency: 'monthly', priority: 0.4},
        [absoluteRoute(routes.feeds)]: {changeFrequency: 'monthly', priority: 0.4},
        [absoluteRoute(routes.audioFeed)]: {changeFrequency: 'daily', priority: 0.3},
        [absoluteRoute(routes.articleFeed)]: {changeFrequency: 'daily', priority: 0.3},
        [absoluteRoute(routes.imprint)]: {changeFrequency: 'yearly', priority: 0.3},
        [absoluteRoute(routes.privacy)]: {changeFrequency: 'yearly', priority: 0.3},
        [absoluteRoute(routes.about)]: {changeFrequency: 'monthly', priority: 0.8},
    };

    for (const entry of staticEntries) {
        const config = staticPriorities[entry.url];
        if (config) {
            entry.changeFrequency = config.changeFrequency;
            entry.priority = config.priority;
        }
    }

    const dynamicEntries: MetadataRoute.Sitemap = [
        ...buildDynamicEntries(articles, routes.article, 'weekly', 0.8),
        ...buildDynamicEntries(podcasts, routes.podcast, 'weekly', 0.8),
        ...buildDynamicEntries(categories, routes.category, 'monthly', 0.5),
        ...buildDynamicEntries(authors, routes.author, 'monthly', 0.5),
    ];

    return [...staticEntries, ...dynamicEntries];
}
