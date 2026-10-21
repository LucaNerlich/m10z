import {MetadataRoute} from 'next';

import {absoluteRoute, routes} from '@/src/lib/routes';
import {sitemapTag, typeTag} from '@/src/lib/shared/contracts/strapi-contract/tags';
import {fetchPublishedSlugs, type PublishedSlugEntry} from '@/src/lib/publishedSlugs';
import {getM12GArchive} from '@/src/lib/m12g/m12gArchive';
import {monthsWithContent} from '@/src/lib/statistik/statistikMonth';
import {getStatistikDashboard} from '@/src/lib/statistik/statistikSource';

function createLanguageAlternates(url: string) {
    return {
        languages: {
            de: url,
            'x-default': url,
        },
    };
}

function buildDynamicEntries(
    entries: PublishedSlugEntry[],
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

type StaticEntryConfig = readonly [
    path: string,
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: number,
];

function buildStaticEntries(entries: readonly StaticEntryConfig[]): MetadataRoute.Sitemap {
    return entries.map(([path, changeFrequency, priority]) => {
        const absoluteUrl = absoluteRoute(path);
        return {
            url: absoluteUrl,
            alternates: createLanguageAlternates(absoluteUrl),
            changeFrequency,
            priority,
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
    const [articles, podcasts, categories, authors, statistik, m12gArchive] = await Promise.all([
        fetchPublishedSlugs('articles', [sitemapTag('articles'), typeTag('article')]),
        fetchPublishedSlugs('podcasts', [sitemapTag('podcasts'), typeTag('podcast')]),
        fetchPublishedSlugs('categories', [sitemapTag('categories')]),
        fetchPublishedSlugs('authors', [sitemapTag('authors')]),
        getStatistikDashboard(),
        getM12GArchive(),
    ]);
    const statistikMonths = statistik ? monthsWithContent(statistik.heatmap) : [];

    // Each route declares its own hints once; a previous second, URL-keyed table
    // had to be kept in sync by hand (a route added in one place silently lost
    // its changeFrequency/priority in the other).
    const staticEntries = buildStaticEntries([
        [routes.home, 'daily', 1.0],
        [routes.articles, 'daily', 0.9],
        [routes.podcasts, 'daily', 0.9],
        [routes.categories, 'weekly', 0.6],
        [routes.authors, 'weekly', 0.6],
        [routes.m12g, 'monthly', 0.4],
        [routes.m12gGames, 'monthly', 0.4],
        [routes.statistik, 'monthly', 0.4],
        [routes.feeds, 'monthly', 0.4],
        [routes.apps, 'monthly', 0.4],
        [routes.changelog, 'monthly', 0.3],
        [routes.audioFeed, 'daily', 0.3],
        [routes.articleFeed, 'daily', 0.3],
        [routes.imprint, 'yearly', 0.3],
        [routes.privacy, 'yearly', 0.3],
        [routes.about, 'monthly', 0.8],
    ]);

    const dynamicEntries: MetadataRoute.Sitemap = [
        ...buildDynamicEntries(articles, routes.article, 'weekly', 0.8),
        ...buildDynamicEntries(podcasts, routes.podcast, 'weekly', 0.8),
        ...buildDynamicEntries(categories, routes.category, 'monthly', 0.5),
        ...buildDynamicEntries(authors, routes.author, 'monthly', 0.5),
        ...buildDynamicEntries(m12gArchive.gameHistory, routes.m12gGame, 'monthly', 0.3),
        ...buildDynamicEntries(
            statistikMonths.map((slug) => ({slug})),
            routes.statistikMonth,
            'monthly',
            0.3,
        ),
    ];

    return [...staticEntries, ...dynamicEntries];
}
