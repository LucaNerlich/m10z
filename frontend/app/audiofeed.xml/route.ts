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
    normalizeBaseUrl,
} from '@/src/lib/rss/feedRoute';

const REVALIDATE_SECONDS = 86400; // heavy caching; invalidate explicitly on Strapi lifecycle changes

const SITE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_DOMAIN ?? 'https://m10z.de');
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ? normalizeBaseUrl(process.env.NEXT_PUBLIC_STRAPI_URL) : '';
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
        const query =
            `/api/podcasts?` +
            `sort=publishedAt:desc&` +
            `pagination[pageSize]=${pageSize}&pagination[page]=${page}&` +
            `populate=*`;

        const res = await fetchStrapiJson<{
            data: unknown[];
            meta?: {pagination?: {page: number; pageCount: number; total: number}};
        }>(query);

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
    return all.filter((p) => Boolean(p.publishedAt));
}

async function fetchAudioFeedSingle(): Promise<StrapiAudioFeedSingle> {
    const res = await fetchStrapiJson<{data: StrapiAudioFeedSingle}>(
        `/api/audio-feed?populate=*`,
    );
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
    'use cache';
    const [feed, episodes] = await Promise.all([fetchAudioFeedSingle(), fetchAllPodcasts()]);
    const cfg = getAudioFeedDefaults();
    const {xml, etagSeed, lastModified} = generateAudioFeedXml({
        cfg,
        strapiUrl: STRAPI_URL,
        channel: feed.channel,
        episodes,
    });

    // Strong-ish ETag tied to latest publish + count (same across instances).
    const etag = `"${sha256Hex(etagSeed)}"`;
    return {xml, etag, lastModified};
}

export async function GET(request: Request) {
    try {
        const {xml, etag, lastModified} = await getCachedAudioFeed();
        const prettyXml = formatXml(xml, 4);

        const headers = buildRssHeaders({ etag, lastModified });
        const maybe304 = maybeReturn304(request, etag, headers);
        if (maybe304) return maybe304;

        return new Response(prettyXml, { headers });
    } catch (err) {
        const fallback = fallbackFeedXml({
            title: 'M10Z Podcasts',
            link: SITE_URL,
            selfLink: `${SITE_URL}/audiofeed.xml`,
            description: 'Feed temporarily unavailable',
        });

        return new Response(formatXml(fallback, 2), {
            status: 503,
            headers: buildRssHeaders({}),
        });
    }
}
