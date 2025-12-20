import {
    type AudioFeedConfig,
    generateAudioFeedXml,
    type StrapiAudioFeedSingle,
    type StrapiPodcast,
} from '@/src/lib/rss/audiofeed';
import {sha256Hex} from '@/src/lib/rss/xml';
import prettify from 'prettify-xml';

const REVALIDATE_SECONDS = 86400; // heavy caching; invalidate explicitly on Strapi lifecycle changes

function getRequiredEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing ${name}`);
    return v;
}

function getSiteUrl(): string {
    // Public canonical base for links in the feed.
    return (process.env.NEXT_PUBLIC_DOMAIN ?? 'https://m10z.de').replace(/\/+$/, '');
}

function getStrapiBaseUrl(): string {
    // Base used to turn relative Strapi media URLs into absolute enclosure URLs.
    return getRequiredEnv('NEXT_PUBLIC_STRAPI_URL').replace(/\/+$/, '');
}

async function fetchStrapiJson<T>(pathWithQuery: string): Promise<T> {
    const base = getStrapiBaseUrl();
    const url = new URL(pathWithQuery, base);

    const headers = new Headers();
    const token = process.env.STRAPI_API_TOKEN;
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(url, {
        headers,
        next: {
            revalidate: REVALIDATE_SECONDS,
            tags: ['feed:audio', 'strapi:podcast', 'strapi:audio-feed'],
        },
    });

    if (!res.ok) {
        throw new Error(`Strapi request failed: ${res.status} ${res.statusText}`);
    }

    return (await res.json()) as T;
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
    const siteUrl = getSiteUrl();
    return {
        siteUrl,
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
        strapiUrl: getStrapiBaseUrl(),
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
        const prettyXml = prettify(xml, {indent: 4, newline: '\n'});

        const headers = new Headers();
        headers.set('Content-Type', 'application/rss+xml; charset=utf-8');
        headers.set('Cache-Control', 'public, max-age=3600, must-revalidate');
        headers.set('ETag', etag);
        if (lastModified) headers.set('Last-Modified', lastModified.toUTCString());

        // Conditional GET support
        const inm = request.headers.get('if-none-match');
        if (inm && inm === etag) {
            return new Response(null, {status: 304, headers});
        }

        return new Response(prettyXml, {headers});
    } catch (err) {
        // During build or misconfiguration (e.g. STRAPI_URL missing), return a minimal (valid) feed
        // instead of throwing and breaking the build.
        const siteUrl = getSiteUrl();
        const fallbackXml =
            `<?xml version="1.0" encoding="UTF-8"?>\n` +
            `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">\n` +
            `  <channel>\n` +
            `    <title>M10Z Podcasts</title>\n` +
            `    <link>${siteUrl}</link>\n` +
            `    <description>Feed temporarily unavailable</description>\n` +
            `    <atom:link href="${siteUrl}/audiofeed.xml" rel="self" type="application/rss+xml"/>\n` +
            `  </channel>\n` +
            `</rss>\n`;

        return new Response(prettify(fallbackXml, {indent: 2, newline: '\n'}), {
            status: 503,
            headers: {'Content-Type': 'application/rss+xml; charset=utf-8'},
        });
    }
}
