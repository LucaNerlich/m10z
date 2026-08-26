import {fetchStrapiCollection} from '@/src/lib/strapi/contentAccess';
import {buildSlugIndexQuery} from '@/src/lib/strapi-queries';
import {type StrapiCollectionResponse} from '@/src/lib/strapi/responses';
import {CACHE_REVALIDATE_DEFAULT} from '@/src/lib/cache/constants';
import {getErrorMessage} from '@/src/lib/errors';

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

        let res: StrapiCollectionResponse<StrapiSlugItem>;
        try {
            res = await fetchStrapiCollection<StrapiSlugItem>(endpoint, query, {
                tags,
                // Without an explicit revalidate the fetch is uncached (Next 15+),
                // making the tags inert and hammering Strapi on every sitemap
                // regeneration.
                revalidate: CACHE_REVALIDATE_DEFAULT,
            });
        } catch (error) {
            // CMS unreachable: degrade to the entries collected so far instead of
            // failing the whole sitemap/llms.txt generation.
            console.error(`fetchPublishedSlugs(${endpoint}): ${getErrorMessage(error)}`);
            break;
        }

        const data = Array.isArray(res.data) ? res.data : [];
        data.forEach(({slug, updatedAt, publishedAt}) => {
            if (!slug || !publishedAt) return;
            entries.push({slug, lastModified: updatedAt ?? publishedAt ?? undefined});
        });

        const pagination = res.meta?.pagination;
        const done =
            !pagination ||
            (pagination.page ?? 0) >= (pagination.pageCount ?? 0) ||
            data.length === 0;
        if (done) break;
        page++;
    }

    return entries;
}
