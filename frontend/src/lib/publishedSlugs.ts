import {fetchStrapiCollection} from '@/src/lib/strapi';

type StrapiSlugItem = {
    slug: string;
    updatedAt?: string | null;
    publishedAt?: string | null;
};

export type PublishedSlugEntry = {slug: string; lastModified?: string};

/**
 * Fetch all published slugs from a Strapi collection, paginating through the full result set.
 *
 * Returns entries with `slug` and optional `lastModified` timestamp (preferring `updatedAt`
 * over `publishedAt`). Entries without a slug or publishedAt are skipped.
 *
 * @param endpoint - The Strapi REST API collection endpoint (e.g., 'articles', 'podcasts')
 * @param tags - Cache tags to associate with the fetch requests
 * @returns An array of slug entries with optional lastModified dates
 */
export async function fetchPublishedSlugs(
    endpoint: string,
    tags: string[],
): Promise<PublishedSlugEntry[]> {
    const pageSize = 100;
    let page = 1;
    const entries: PublishedSlugEntry[] = [];

    while (true) {
        const query =
            `fields[0]=slug&fields[1]=updatedAt&fields[2]=publishedAt&` +
            `pagination[pageSize]=${pageSize}&pagination[page]=${page}&` +
            `status=published`;

        const res = await fetchStrapiCollection<StrapiSlugItem>(endpoint, query, {
            tags,
        });

        const data = Array.isArray(res.data) ? res.data : [];
        data.forEach(({slug, updatedAt, publishedAt}) => {
            if (!slug || !publishedAt) return;
            entries.push({slug, lastModified: updatedAt ?? publishedAt ?? undefined});
        });

        const pagination = res.meta?.pagination;
        // Three-way stop: missing pagination (unexpected API shape), page reached the end,
        // or empty page (Strapi bug/race condition). All three are needed for robustness.
        const done =
            !pagination ||
            pagination.page >= (pagination.pageCount ?? 0) ||
            data.length === 0;
        if (done) break;
        page++;
    }

    return entries;
}
