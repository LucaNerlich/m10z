import qs from 'qs';

import {
    type AudioFeedConfig,
    generateAudioFeedXml,
    type StrapiAudioFeedSingle,
    type StrapiPodcast,
} from '@/src/lib/rss/audiofeed';
import {sha256Hex} from '@/src/lib/rss/xml';
import {
    buildRssHeaders,
    fallbackFeedXml,
    fetchStrapiJson as fetchStrapiJsonCore,
    formatXml,
    maybeReturn304,
} from '@/src/lib/rss/feedRoute';
import {CACHE_REVALIDATE_DEFAULT} from '@/src/lib/cache/constants';

const SITE_URL = (process.env.NEXT_PUBLIC_DOMAIN ?? 'https://m10z.de').replace(/\/+$/, '');
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL
    ? process.env.NEXT_PUBLIC_STRAPI_URL.replace(/\/+$/, '')
    : '';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

async function fetchStrapiJson<T>(pathWithQuery: string): Promise<T> {
    if (!STRAPI_URL) throw new Error('Missing NEXT_PUBLIC_STRAPI_URL');
    return await fetchStrapiJsonCore<T>({
        strapiBaseUrl: STRAPI_URL,
        apiPathWithQuery: pathWithQuery,
        token: STRAPI_TOKEN,
        tags: ['feed:audio', 'strapi:podcast', 'strapi:audio-feed'],
        revalidate: CACHE_REVALIDATE_DEFAULT,
    });
}

/**
 * Fetches all published podcasts from Strapi, handling pagination until all pages are retrieved.
 *
 * The results are ordered by `publishedAt` descending and include each podcast's populated relations.
 *
 * @returns An array of `StrapiPodcast` objects retrieved from Strapi (empty array if none).
 */
async function fetchAllPodcasts(): Promise<StrapiPodcast[]> {
    const pageSize = 100;
    let page = 1;
    const all: StrapiPodcast[] = [];
    while (true) {
        const query = qs.stringify(
            {
                sort: ['publishedAt:desc'],
                status: 'published',
                pagination: {pageSize, page},
                populate: {
                    base: {
                        populate: {
                            cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                            banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                        },
                        fields: ['title', 'description', 'date'],
                    },
                    authors: {
                        populate: {avatar: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']}},
                        fields: ['title', 'slug', 'description'],
                    },
                    categories: {
                        populate: {
                            base: {
                                populate: {
                                    cover: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                                    banner: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']},
                                },
                                fields: ['title', 'description'],
                            },
                        },
                        fields: ['slug'],
                    },
                    file: {
                        populate: '*',
                    },
                },
                fields: ['slug', 'duration', 'shownotes', 'wordCount', 'publishedAt'],
            },
            {encodeValuesOnly: true},
        );

        const res = await fetchStrapiJson<{
            data: unknown[];
            meta?: {pagination?: {page: number; pageCount: number; total: number}};
        }>(`/api/podcasts?${query}`);

        const items = Array.isArray(res.data) ? (res.data as StrapiPodcast[]) : [];
        all.push(...items);

        const pagination = res.meta?.pagination;
        const done =
            !pagination ||
            pagination.page >= pagination.pageCount ||
            items.length === 0;

        if (done) break;
        page++;
    }

    return all;
}

/**
 * Fetches the single audio feed entry from Strapi including channel image metadata.
 *
 * The returned object includes the channel and its image with these populated image fields:
 * `url`, `width`, `height`, `blurhash`, `alternativeText`, and `formats`.
 *
 * @returns The audio feed entry as stored in Strapi (`StrapiAudioFeedSingle`), containing channel data and populated image metadata.
 */
async function fetchAudioFeedSingle(): Promise<StrapiAudioFeedSingle> {
    const query = qs.stringify(
        {
            populate: {
                channel: {
                    populate: {image: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']}},
                },
            },
        },
        {encodeValuesOnly: true},
    );
    const res = await fetchStrapiJson<{data: StrapiAudioFeedSingle}>(`/api/audio-feed?${query}`);
    return res.data;
}

function getAudioFeedDefaults(): AudioFeedConfig {
    return {
        siteUrl: SITE_URL,
        ttlSeconds: 60,
        language: 'de',
        copyright: 'All rights reserved',
        webMaster: 'm10z@posteo.de',
        authorEmail: 'm10z@posteo.de',
        itunesAuthor: 'M10Z',
        itunesExplicit: 'false',
        itunesType: 'episodic',
        podcastGuid: 'E9QfcR8TYeotS5ceJLmn',
    };
}

async function getCachedAudioFeed() {
    const [feed, episodes] = await Promise.all([fetchAudioFeedSingle(), fetchAllPodcasts()]);
    const cfg = getAudioFeedDefaults();
    const {xml, etagSeed, lastModified} = generateAudioFeedXml({
        cfg,
        channel: feed.channel,
        episodeFooter: feed.episodeFooter,
        episodes,
    });

    // Strong-ish ETag tied to latest publish + count (same across instances).
    // Include XML content to ensure content-only changes update the ETag.
    const etag = `"${sha256Hex(`${etagSeed}:${sha256Hex(xml)}`)}"`;
    return {xml, etag, lastModified};
}

export async function buildAudioFeedResponse(request: Request): Promise<Response> {
    try {
        const {xml, etag, lastModified} = await getCachedAudioFeed();
        const prettyXml = formatXml(xml);

        // Encourage clients to revalidate on every request; server-side fetch remains cached by tags.
        const headers = buildRssHeaders({
            etag,
            lastModified,
        });
        const maybe304 = maybeReturn304(request, etag, headers);
        if (maybe304) return maybe304;

        return new Response(prettyXml, {headers});
    } catch (err) {
        const fallback = fallbackFeedXml({
            title: 'M10Z Podcasts',
            link: SITE_URL,
            selfLink: `${SITE_URL}/audiofeed.xml`,
            description: 'Feed temporarily unavailable',
        });

        return new Response(formatXml(fallback), {
            status: 503,
            headers: buildRssHeaders({}),
        });
    }
}