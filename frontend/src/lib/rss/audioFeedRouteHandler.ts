import qs from 'qs';

import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {
    type AudioFeedConfig,
    generateAudioFeedXml,
    type StrapiAudioFeedSingle,
    type StrapiPodcast,
} from '@/src/lib/rss/audiofeed';
import {filterPublished} from '@/src/lib/rss/publishDate';
import {sha256Hex} from '@/src/lib/rss/xml';
import {
    buildRssHeaders,
    fallbackFeedXml,
    fetchStrapiJson as fetchStrapiJsonCore,
    formatXml,
    maybeReturn304,
} from '@/src/lib/rss/feedRoute';

const REVALIDATE_SECONDS = 86400; // heavy caching; invalidate explicitly on Strapi lifecycle changes

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
        revalidateSeconds: REVALIDATE_SECONDS,
        tags: ['feed:audio', 'strapi:podcast', 'strapi:audio-feed'],
    });
}

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
                        populate: ['cover', 'banner'],
                        fields: ['title', 'description', 'date'],
                    },
                    authors: {
                        populate: ['avatar'],
                        fields: ['title', 'slug', 'description'],
                    },
                    categories: {
                        populate: {
                            base: {
                                populate: ['cover', 'banner'],
                                fields: ['title', 'description'],
                            },
                        },
                        fields: ['slug'],
                    },
                    file: {
                        populate: '*',
                    },
                },
                fields: ['slug', 'duration', 'shownotes', 'publishedAt'],
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

    // Only published episodes should be in the public feed.
    return filterPublished(all, (p) => getEffectiveDate(p));
}

async function fetchAudioFeedSingle(): Promise<StrapiAudioFeedSingle> {
    const query = qs.stringify(
        {
            populate: {
                channel: {
                    populate: ['image'],
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

