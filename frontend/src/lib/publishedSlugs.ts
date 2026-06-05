import {fetchStrapiCollection} from '@/src/lib/strapi/contentAccess';
import {buildSlugIndexQuery} from '@/src/lib/strapi-queries';

type StrapiSlugItem = {
    slug: string;
    updatedAt?: string | null;
    publishedAt?: string | null;
};

export type PublishedSlugEntry = {slug: string; lastModified?: string};

export async function fetchPublishedSlugs(
    endpoint: string,
    tags: string[],
): Promise<PublishedSlugEntry[]> {
    const pageSize = 100;
    let page = 1;
    const entries: PublishedSlugEntry[] = [];

    while (true) {
        const query = buildSlugIndexQuery({page, pageSize});

        const res = await fetchStrapiCollection<StrapiSlugItem>(endpoint, query, {tags});

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
