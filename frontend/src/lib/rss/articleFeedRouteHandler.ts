import qs from 'qs';
import fs from 'node:fs/promises';
import path from 'node:path';

import {generateArticleFeedXml, type StrapiArticle, type StrapiArticleFeedSingle} from '@/src/lib/rss/articlefeed';
import {sha256Hex} from '@/src/lib/rss/xml';
import {
    buildRssHeaders,
    fallbackFeedXml,
    fetchStrapiJson as fetchStrapiJsonCore,
    maybeReturn304,
} from '@/src/lib/rss/feedRoute';
import {CACHE_REVALIDATE_DEFAULT} from '@/src/lib/cache/constants';
import {
    populateBaseMedia,
    populateAuthorAvatar,
    populateCategoryBase,
    MEDIA_FIELDS,
} from '@/src/lib/strapiContent';
import {checkRateLimit} from '@/src/lib/security/rateLimit';
import {recordDiagnosticEvent} from '@/src/lib/diagnostics/runtimeDiagnostics';

const SITE_URL = (process.env.NEXT_PUBLIC_DOMAIN ?? 'https://m10z.de').replace(/\/+$/, '');
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL
    ? process.env.NEXT_PUBLIC_STRAPI_URL.replace(/\/+$/, '')
    : '';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

const FEED_REGENERATE_MS = Number(process.env.FEED_REGENERATE_MS ?? '') || 30 * 60_000;
const FEED_CACHE_DIR = process.env.FEED_CACHE_DIR ?? path.join(process.cwd(), '.feed-cache');
const ARTICLE_FEED_PATH = path.join(FEED_CACHE_DIR, 'rss.xml');
const ARTICLE_FEED_META_PATH = path.join(FEED_CACHE_DIR, 'rss.meta.json');

type CachedFeed = {
    xml: string;
    etag: string;
    lastModified: Date | null | undefined;
    builtAtMs: number;
    itemCount: number;
};

let cachedFeed: CachedFeed | null = null;
let inflight: Promise<CachedFeed> | null = null;
let schedulerStarted = false;

function getClientIp(request: Request): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]?.trim() || 'unknown';
    return request.headers.get('x-real-ip') ?? 'unknown';
}

async function ensureFeedDir() {
    await fs.mkdir(FEED_CACHE_DIR, {recursive: true});
}

async function writeFeedToDisk(feed: CachedFeed) {
    await ensureFeedDir();
    await fs.writeFile(ARTICLE_FEED_PATH, feed.xml, 'utf8');
    await fs.writeFile(
        ARTICLE_FEED_META_PATH,
        JSON.stringify(
            {
                etag: feed.etag,
                builtAtMs: feed.builtAtMs,
                lastModified: feed.lastModified ? feed.lastModified.toISOString() : null,
                itemCount: feed.itemCount,
            },
            null,
            2,
        ),
        'utf8',
    );
}

async function readFeedFromDisk(): Promise<CachedFeed | null> {
    try {
        const [xml, metaRaw] = await Promise.all([
            fs.readFile(ARTICLE_FEED_PATH, 'utf8'),
            fs.readFile(ARTICLE_FEED_META_PATH, 'utf8'),
        ]);
        const meta = JSON.parse(metaRaw) as {
            etag?: string;
            builtAtMs?: number;
            lastModified?: string | null;
            itemCount?: number;
        };
        if (!meta.etag || !meta.builtAtMs) return null;
        return {
            xml,
            etag: meta.etag,
            builtAtMs: meta.builtAtMs,
            lastModified: meta.lastModified ? new Date(meta.lastModified) : null,
            itemCount: meta.itemCount ?? 0,
        };
    } catch {
        return null;
    }
}

async function fetchStrapiJson<T>(pathWithQuery: string): Promise<T> {
    if (!STRAPI_URL) throw new Error('Missing NEXT_PUBLIC_STRAPI_URL');
    return await fetchStrapiJsonCore<T>({
        strapiBaseUrl: STRAPI_URL,
        apiPathWithQuery: pathWithQuery,
        token: STRAPI_TOKEN,
        tags: ['feed:article', 'strapi:article', 'strapi:article-feed'],
        revalidate: CACHE_REVALIDATE_DEFAULT,
        timeoutMs: 30_000,
    });
}

/**
 * Fetches all published articles from Strapi, paging through results until all pages are retrieved.
 *
 * The fetched articles include `slug`, `content`, `wordCount`, and `publishedAt`, and have populated
 * `base` (cover, banner, title, description, date), `authors` (avatar, title, slug, description),
 * and `categories` (slug with populated base cover/banner/title/description).
 *
 * @returns An array of `StrapiArticle` objects ordered by `publishedAt` descending.
 */
async function fetchAllArticles(): Promise<StrapiArticle[]> {
    const maxPages = 50; // safety: prevents runaway loops if pagination gets weird
    const maxItems = Number(process.env.FEED_ARTICLE_MAX_ITEMS ?? '') || 1000; // configurable; default 1000
    const pageSize = 100;
    let page = 1;
    const all: StrapiArticle[] = [];
    while (page <= maxPages && all.length < maxItems) {
        const query = qs.stringify(
            {
                sort: ['publishedAt:desc'],
                status: 'published',
                pagination: {pageSize, page},
                populate: {
                    base: populateBaseMedia,
                    authors: populateAuthorAvatar,
                    categories: populateCategoryBase,
                },
                fields: ['slug', 'content', 'wordCount', 'publishedAt'],
            },
            {encodeValuesOnly: true},
        );

        const res = await fetchStrapiJson<{
            data: unknown[];
            meta?: {pagination?: {page: number; pageCount: number; total: number}};
        }>(`/api/articles?${query}`);

        const items = Array.isArray(res.data) ? (res.data as StrapiArticle[]) : [];
        const remaining = Math.max(0, maxItems - all.length);
        if (remaining > 0) {
            all.push(...items.slice(0, remaining));
        }

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
 * Fetches the article feed entity with its channel image populated.
 *
 * @returns The article feed record including `channel.image` with `url`, `width`, `height`, `blurhash`, `alternativeText`, and `formats` fields
 */
async function fetchArticleFeedSingle(): Promise<StrapiArticleFeedSingle> {
    const query = qs.stringify(
        {
            populate: {
                channel: {
                    populate: {image: {fields: MEDIA_FIELDS}},
                },
            },
        },
        {encodeValuesOnly: true},
    );
    const res = await fetchStrapiJson<{data: StrapiArticleFeedSingle}>(`/api/article-feed?${query}`);
    return res.data;
}

/**
 * Builds the article feed XML, computes a content-derived ETag, and returns the XML with caching metadata.
 *
 * @returns An object containing:
 * - `xml` — the complete feed XML string.
 * - `etag` — a quoted SHA-256 hex ETag derived from the feed content and seed.
 * - `lastModified` — the feed's last-modified timestamp as provided by the source feed data.
 */
async function getCachedArticleFeed() {
    const [feed, articles] = await Promise.all([fetchArticleFeedSingle(), fetchAllArticles()]);
    const {xml, etagSeed, lastModified} = generateArticleFeedXml({
        siteUrl: SITE_URL,
        channel: feed.channel,
        articles,
    });
    // Use the full XML content to derive the ETag so content-only changes invalidate caches.
    const etag = `"${sha256Hex(`${etagSeed}:${sha256Hex(xml)}`)}"`;
    return {xml, etag, lastModified, itemCount: articles.length};
}

async function refreshFeed(): Promise<CachedFeed> {
    if (inflight) return inflight;

    inflight = (async () => {
        const startedAt = Date.now();
        const built = await getCachedArticleFeed();
        const durationMs = Date.now() - startedAt;
        const next: CachedFeed = {
            xml: built.xml,
            etag: built.etag,
            lastModified: built.lastModified,
            builtAtMs: Date.now(),
            itemCount: built.itemCount,
        };
        cachedFeed = next;
        inflight = null;
        await writeFeedToDisk(next);

        if (durationMs >= 500) {
            recordDiagnosticEvent({
                ts: Date.now(),
                kind: 'route',
                name: 'feed.article.build',
                ok: true,
                durationMs,
                detail: {items: built.itemCount},
            });
        }

        return next;
    })().catch((err) => {
        inflight = null;
        throw err;
    });

    return inflight;
}

function ensureScheduler() {
    if (schedulerStarted) return;
    schedulerStarted = true;
    void refreshFeed().catch(() => undefined);
    const timer = setInterval(() => {
        void refreshFeed().catch(() => undefined);
    }, FEED_REGENERATE_MS);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (timer as any).unref?.();
}

export async function buildArticleFeedResponse(request: Request): Promise<Response> {
    ensureScheduler();

    const ip = getClientIp(request);
    const rl = checkRateLimit(`feed:article:${ip}`, {windowMs: 60_000, max: 20});
    if (!rl.ok) {
        const headers = buildRssHeaders({
            cacheControl: 'no-store',
        });
        headers.set('Retry-After', String(rl.retryAfterSeconds));
        recordDiagnosticEvent({
            ts: Date.now(),
            kind: 'route',
            name: 'feed.article.rate_limit',
            ok: false,
            durationMs: 0,
            detail: {retryAfterSeconds: rl.retryAfterSeconds},
        });
        return new Response('Too Many Requests', {
            status: 429,
            headers,
        });
    }

    try {
        const now = Date.now();
        const disk = await readFeedFromDisk();
        const freshEnough = disk ? now - disk.builtAtMs < FEED_REGENERATE_MS * 2 : false;
        const feed = disk && freshEnough ? disk : await refreshFeed();

        // Encourage clients to revalidate on every request; server-side fetch remains cached by tags.
        const headers = buildRssHeaders({
            etag: feed.etag,
            lastModified: feed.lastModified,
            cacheControl: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400, must-revalidate',
        });
        const maybe304 = maybeReturn304(request, feed.etag, headers);
        if (maybe304) return maybe304;

        return new Response(feed.xml, {headers});
    } catch {
        const fallback = fallbackFeedXml({
            title: 'M10Z Artikel',
            link: SITE_URL,
            selfLink: `${SITE_URL}/rss.xml`,
            description: 'Feed temporarily unavailable',
        });

        recordDiagnosticEvent({
            ts: Date.now(),
            kind: 'route',
            name: 'feed.article.serve',
            ok: false,
            durationMs: 0,
        });

        return new Response(fallback, {
            status: 503,
            headers: buildRssHeaders({
                cacheControl: 'no-store',
            }),
        });
    }
}