import qs from 'qs';

import {sha256Hex} from '@/src/lib/rss/xml';
import {normalizeBaseUrl} from '@/src/lib/rss/feedRoute';
import {
    fetchAllPaginated,
    fetchFeedSingle,
    type StrapiFeedFetcher,
} from '@/src/lib/rss/feedFetcher';
import {MEDIA_FIELDS, populateAuthorAvatar, populateCategory} from '@/src/lib/strapi-queries/populate';
import {buildFeedListQuery} from '@/src/lib/strapi-queries/queries';

// Shared building blocks for the RSS / audio feeds. The two feed handlers differ only
// in their entity (article vs podcast), populate/field sets, and XML generator; the
// site URL, channel query, list-query shape, fetch orchestration, and etag formula are
// identical and live here once instead of being mirrored per handler.

// One resolution of the public site origin for both feeds.
export const FEED_SITE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_DOMAIN ?? 'https://m10z.de');

// The channel single-type populate is identical for both feeds.
export const FEED_CHANNEL_SINGLE_QUERY = qs.stringify(
    {populate: {channel: {populate: {image: {fields: MEDIA_FIELDS}}}}},
    {encodeValuesOnly: true},
);

// Common list population: cover, banner, authors, categories. The audio feed extends
// this with its file enclosure (see createFeedListQuery callers).
export const feedListPopulate = {
    cover: {fields: MEDIA_FIELDS},
    banner: {fields: MEDIA_FIELDS},
    authors: populateAuthorAvatar,
    categories: populateCategory,
};

// Build a paginated list-query string for a feed (sorted newest-first, published only).
export function createFeedListQuery(args: {
    fields: readonly string[];
    populate: object;
}): (page: number, pageSize: number) => string {
    return buildFeedListQuery(args);
}

// The feed etag: a stable hash of the generator's seed plus the rendered document.
export function computeFeedEtag(etagSeed: string, xml: string): string {
    return `"${sha256Hex(`${etagSeed}:${sha256Hex(xml)}`)}"`;
}

// Fetch a feed's channel single-type and its full paginated item list in parallel.
// The single building block both handlers used to wire by hand.
export async function fetchFeedSourceData<TSingle, TItem>(args: {
    fetcher: StrapiFeedFetcher;
    singlePathWithQuery: string;
    listBasePath: string;
    listQueryBuilder: (page: number, pageSize: number) => string;
    resolveMaxItems: () => number;
}): Promise<{single: TSingle; items: TItem[]}> {
    const [single, items] = await Promise.all([
        fetchFeedSingle<TSingle>(args.fetcher, args.singlePathWithQuery),
        fetchAllPaginated<TItem>({
            fetcher: args.fetcher,
            apiBasePath: args.listBasePath,
            buildQueryString: args.listQueryBuilder,
            resolveMaxItems: args.resolveMaxItems,
        }),
    ]);
    return {single, items};
}
