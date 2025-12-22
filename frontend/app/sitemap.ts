import {MetadataRoute} from 'next';

import {absoluteRoute, routes} from '@/src/lib/routes';
import {fetchStrapiCollection} from '@/src/lib/strapi';

type StrapiSlugItem = {
    slug: string;
    updatedAt?: string | null;
    publishedAt?: string | null;
};

type SitemapEntry = {slug: string; lastModified?: string};

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

    const staticEntries: MetadataRoute.Sitemap = [
        {url: absoluteRoute(routes.home)},
        {url: absoluteRoute(routes.imprint)},
        {url: absoluteRoute(routes.privacy)},
        {url: absoluteRoute(routes.articles)},
        {url: absoluteRoute(routes.podcasts)},
        {url: absoluteRoute(routes.categories)},
        {url: absoluteRoute(routes.authors)},
        {url: absoluteRoute(routes.audioFeed)},
        {url: absoluteRoute(routes.articleFeed)},
    ];

    const dynamicEntries: MetadataRoute.Sitemap = [
        ...articles.map(({slug, lastModified}) => ({
            url: absoluteRoute(routes.article(slug)),
            lastModified,
        })),
        ...podcasts.map(({slug, lastModified}) => ({
            url: absoluteRoute(routes.podcast(slug)),
            lastModified,
        })),
        ...categories.map(({slug, lastModified}) => ({
            url: absoluteRoute(routes.category(slug)),
            lastModified,
        })),
        ...authors.map(({slug, lastModified}) => ({
            url: absoluteRoute(routes.author(slug)),
            lastModified,
        })),
    ];

    return [...staticEntries, ...dynamicEntries];
}

