import {MetadataRoute} from 'next';

import {absoluteRoute, routes} from '@/src/lib/routes';
import {fetchStrapiCollection} from '@/src/lib/strapi';

type StrapiSlugItem = {
    slug: string;
    updatedAt?: string | null;
    publishedAt?: string | null;
};

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
): MetadataRoute.Sitemap {
    return entries.map(({slug, lastModified}) => {
        const url = absoluteRoute(buildPath(slug));
        return {
            url,
            lastModified,
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

async function fetchPublishedSlugs(
    endpoint: string,
    tags: string[],
): Promise<SitemapEntry[]> {
    const pageSize = 100;
    let page = 1;
    const entries: SitemapEntry[] = [];

    while (true) {
        const query =
            `fields[0]=slug&fields[1]=updatedAt&fields[2]=publishedAt&` +
            `pagination[pageSize]=${pageSize}&pagination[page]=${page}&` +
            `status=published`;

        const res = await fetchStrapiCollection<StrapiSlugItem>(endpoint, query, {
            revalidateSeconds: 3600,
            tags,
        });

        const data = Array.isArray(res.data) ? res.data : [];
        data.forEach(({slug, updatedAt, publishedAt}) => {
            if (!slug || !publishedAt) return;
            entries.push({slug, lastModified: updatedAt ?? publishedAt ?? undefined});
        });

        const pagination = res.meta?.pagination;
        const done =
            !pagination ||
            pagination.page >= (pagination.pageCount ?? 0) ||
            data.length === 0;
        if (done) break;
        page++;
    }

    return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [articles, podcasts, categories, authors] = await Promise.all([
        fetchPublishedSlugs('articles', ['sitemap:articles', 'strapi:article']),
        fetchPublishedSlugs('podcasts', ['sitemap:podcasts', 'strapi:podcast']),
        fetchPublishedSlugs('categories', ['sitemap:categories']),
        fetchPublishedSlugs('authors', ['sitemap:authors']),
    ]);

    const staticEntries = buildStaticEntries([
        routes.home,
        routes.imprint,
        routes.privacy,
        routes.articles,
        routes.podcasts,
        routes.categories,
        routes.authors,
        routes.audioFeed,
        routes.articleFeed,
    ]);

    const dynamicEntries: MetadataRoute.Sitemap = [
        ...buildDynamicEntries(articles, routes.article),
        ...buildDynamicEntries(podcasts, routes.podcast),
        ...buildDynamicEntries(categories, routes.category),
        ...buildDynamicEntries(authors, routes.author),
    ];

    return [...staticEntries, ...dynamicEntries];
}

