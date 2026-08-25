import markdownToTxt from 'markdown-to-txt';

import {type SearchIndexFile, type SearchRecord, type SearchRecordType} from '../shared/contracts/search/types';
import {documentServicePage} from '../utils/documentServicePage';

import {filterAndLimitMetrics} from './metricsHistory';

/**
 * Minimal structural contract for the Strapi instance as used by the search-index
 * builder (documents reads/writes plus info logging). Callers pass the full
 * Strapi app; this only names what is actually touched.
 */
export type SearchIndexStrapi = {
    documents: (
        uid: string,
    ) => {
        findMany: (params?: Record<string, unknown>) => Promise<unknown>;
        findFirst?: (params?: Record<string, unknown>) => Promise<unknown>;
        update: (params: {documentId: string | number; data: Record<string, unknown>}) => Promise<unknown>;
        create: (params: {data: Record<string, unknown>}) => Promise<unknown>;
    };
    log: {
        info: (message: string, ...args: unknown[]) => void;
    };
};

/** Existing search-index single-type document, as far as `saveIndex` relies on it. */
type ExistingIndexDoc = {
    id?: number | string;
    documentId?: string;
    version?: unknown;
};

type SearchIndexMetrics = {
    buildMs: number;
    fetchMs: {
        articles: number;
        podcasts: number;
        authors: number;
        categories: number;
        total: number;
    };
    processingMs: number;
    counts: {
        articles: number;
        podcasts: number;
        authors: number;
        categories: number;
        total: number;
    };
    payloadBytes?: number;
    payloadKb?: number;
};

type SearchIndexMetricsSnapshot = SearchIndexMetrics & {
    updatedAt: string;
    source?: 'cron' | 'queue' | 'manual';
};

export type SearchIndexMetricsHistoryEntry = SearchIndexMetricsSnapshot;

const MAX_METRICS_ENTRIES = 1000;
const METRICS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let metricsHistory: SearchIndexMetricsSnapshot[] = [];

// Two-pass cleanup: first evict entries older than 30 days, then cap at 1000 entries.
// Both guards are needed — age alone doesn't bound memory during high-frequency rebuilds.
function cleanupMetricsHistory(now: number = Date.now()): void {
    const cutoff = now - METRICS_MAX_AGE_MS;

    metricsHistory = metricsHistory.filter((entry) => {
        const ts = Date.parse(entry.updatedAt);
        if (Number.isNaN(ts)) return false;
        return ts >= cutoff;
    });

    if (metricsHistory.length > MAX_METRICS_ENTRIES) {
        metricsHistory = metricsHistory.slice(0, MAX_METRICS_ENTRIES);
    }
}

export function getLastSearchIndexMetrics(): SearchIndexMetricsSnapshot | null {
    return metricsHistory[0] ?? null;
}

export function getAllSearchIndexMetrics(): SearchIndexMetricsHistoryEntry[] {
    return [...metricsHistory];
}

/**
 * Returns historical search index metrics from in-memory history.
 *
 * - History is stored most-recent-first (index 0 is latest).
 * - `limit` controls the maximum number of entries (default 30, capped at MAX_METRICS_ENTRIES).
 * - `from` / `to` are optional ISO date strings used as inclusive bounds on `updatedAt`.
 *   Invalid date strings are ignored.
 */
export function getHistoricalSearchIndexMetrics(
    limit = 30,
    from?: string,
    to?: string,
): SearchIndexMetricsHistoryEntry[] {
    return filterAndLimitMetrics(metricsHistory, {limit, from, to, maxLimit: MAX_METRICS_ENTRIES});
}
type PlainTextMetrics = {
    addProcessingMs: (ms: number) => void;
};

const PAGE_SIZE = 100;
const DEFAULT_MAX_LEN = 50_000;

function getMaxLen(): number {
    const raw = process.env.SEARCH_INDEX_MAX_LEN;
    if (!raw) return DEFAULT_MAX_LEN;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.min(n, 100_000);
    return DEFAULT_MAX_LEN;
}

function safeText(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) return value;
    return undefined;
}

function sanitizeText(value: unknown): string | undefined {
    const text = safeText(value);
    if (!text) return undefined;
    const cleaned = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Normalized flat Strapi v5 document payload consumed by the index normalizers.
 * Nested relations (cover/banner/avatar/categories/authors) are flattened
 * documents as returned by the Document Service populate depth used here.
 */
type IndexEntry = {
    id?: number | string;
    documentId?: string;
    url?: unknown;
    slug?: unknown;
    title?: unknown;
    description?: unknown;
    date?: unknown;
    publishedAt?: unknown;
    updatedAt?: unknown;
    content?: unknown;
    shownotes?: unknown;
    cover?: IndexEntry | null;
    banner?: IndexEntry | null;
    avatar?: IndexEntry | null;
    categories?: readonly IndexEntry[];
    authors?: readonly IndexEntry[];
};

function effectiveDate(raw: IndexEntry): string | null {
    const override = safeText(raw.date);
    if (override) return override;
    return safeText(raw.publishedAt) ?? null;
}

function toPlainText(value: unknown, metrics?: PlainTextMetrics): string | undefined {
    if (typeof value !== 'string') return undefined;

    const startedAt = metrics ? Date.now() : 0;
    const converted = markdownToTxt(value);
    if (metrics) {
        metrics.addProcessingMs(Date.now() - startedAt);
    }

    const text = converted.replace(/\s+/g, ' ').trim();
    if (text.length === 0) return undefined;

    const maxLen = getMaxLen();
    return text.slice(0, maxLen);
}

function extractMediaUrl(mediaRef: IndexEntry, strapiUrl?: string): string | null {
    if (!strapiUrl || !mediaRef) return null;

    const url = mediaRef.url;
    if (!url || typeof url !== 'string' || url.trim().length === 0) return null;

    if (/^https?:\/\//i.test(url)) return url;
    const trimmedBase = strapiUrl.replace(/\/+$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${trimmedBase}${path}`;
}

// Fallback chain: cover → banner → first category's cover → first category's banner.
// Ensures search results always show an image even when the entry itself has none.
function extractCoverImageUrl(raw: IndexEntry, strapiUrl?: string): string | null {
    if (!strapiUrl) return null;

    const rootCover = raw.cover;
    if (rootCover) {
        const url = extractMediaUrl(rootCover, strapiUrl);
        if (url) return url;
    }

    const rootBanner = raw.banner;
    if (rootBanner) {
        const url = extractMediaUrl(rootBanner, strapiUrl);
        if (url) return url;
    }

    const firstCategory = raw.categories?.[0];
    if (firstCategory) {
        const categoryCover = firstCategory.cover;
        if (categoryCover) {
            const url = extractMediaUrl(categoryCover, strapiUrl);
            if (url) return url;
        }
        const categoryBanner = firstCategory.banner;
        if (categoryBanner) {
            const url = extractMediaUrl(categoryBanner, strapiUrl);
            if (url) return url;
        }
    }

    return null;
}

function extractAuthorAvatarUrl(raw: IndexEntry, strapiUrl?: string): string | null {
    if (!strapiUrl) return null;

    const avatar = raw.avatar;
    if (avatar) {
        return extractMediaUrl(avatar, strapiUrl);
    }

    return null;
}

function extractCategoryCoverUrl(raw: IndexEntry, strapiUrl?: string): string | null {
    if (!strapiUrl) return null;

    const rootCover = raw.cover;
    if (rootCover) {
        const url = extractMediaUrl(rootCover, strapiUrl);
        if (url) return url;
    }

    const rootBanner = raw.banner;
    if (rootBanner) {
        return extractMediaUrl(rootBanner, strapiUrl);
    }

    return null;
}

// Strapi 5's Document Service `findMany()` returns flat documents as a bare array.
async function fetchAllDocuments(
    strapi: SearchIndexStrapi,
    uid: string,
    params: Record<string, unknown>,
): Promise<IndexEntry[]> {
    const items: IndexEntry[] = [];
    let page = 1;

    while (true) {
        const res = (await strapi.documents(uid).findMany({
            ...params,
            status: 'published',
            ...documentServicePage(page, PAGE_SIZE),
        })) as IndexEntry[];

        items.push(...res);

        // Stop paging once the last page came back shorter than the requested
        // page size. `limit`/`start` (not nested `pagination`) are what actually
        // cap the query.
        if (res.length < PAGE_SIZE) break;
        page += 1;
    }

    return items;
}

function relationTitles(entry: IndexEntry): string[] {
    return (entry.categories ?? [])
        .map((c) => sanitizeText(c.title) ?? sanitizeText(c.slug))
        .filter((t): t is string => Boolean(t));
}

function authorNames(entry: IndexEntry): string[] {
    return (entry.authors ?? [])
        .map((a) => sanitizeText(a.title) ?? sanitizeText(a.slug))
        .filter((t): t is string => Boolean(t));
}

function normalizeArticle(article: IndexEntry, strapiUrl?: string, metrics?: PlainTextMetrics): SearchRecord | null {
    const slug = safeText(article.slug);
    const title = sanitizeText(article.title);
    if (!slug || !title) return null;

    const categories = relationTitles(article);
    const authors = authorNames(article);

    return {
        id: `article:${slug}`,
        type: 'article',
        slug,
        title,
        description: sanitizeText(article.description) ?? null,
        content: toPlainText(article.content, metrics) ?? null,
        href: `/artikel/${encodeURIComponent(slug)}`,
        publishedAt: effectiveDate(article),
        tags: [...new Set<string>(['Artikel', ...categories, ...authors])],
        coverImageUrl: extractCoverImageUrl(article, strapiUrl),
    };
}

function normalizePodcast(podcast: IndexEntry, strapiUrl?: string, metrics?: PlainTextMetrics): SearchRecord | null {
    const slug = safeText(podcast.slug);
    const title = sanitizeText(podcast.title);
    if (!slug || !title) return null;

    const categories = relationTitles(podcast);
    const authors = authorNames(podcast);

    return {
        id: `podcast:${slug}`,
        type: 'podcast',
        slug,
        title,
        description: sanitizeText(podcast.description) ?? null,
        content: toPlainText(podcast.shownotes, metrics) ?? null,
        href: `/podcasts/${encodeURIComponent(slug)}`,
        publishedAt: effectiveDate(podcast),
        tags: [...new Set<string>(['Podcast', ...categories, ...authors])],
        coverImageUrl: extractCoverImageUrl(podcast, strapiUrl),
    };
}

function normalizeAuthor(author: IndexEntry, strapiUrl?: string): SearchRecord | null {
    const slug = safeText(author.slug);
    const title = sanitizeText(author.title);
    if (!slug || !title) return null;

    return {
        id: `author:${slug}`,
        type: 'author',
        slug,
        title,
        description: sanitizeText(author.description) ?? null,
        href: `/team/${encodeURIComponent(slug)}`,
        tags: ['Autor-In'],
        coverImageUrl: extractAuthorAvatarUrl(author, strapiUrl),
    };
}

function normalizeCategory(category: IndexEntry, strapiUrl?: string): SearchRecord | null {
    const slug = safeText(category.slug);
    const title = sanitizeText(category.title) ?? slug;
    if (!slug || !title) return null;

    return {
        id: `category:${slug}`,
        type: 'category',
        slug,
        title,
        description: sanitizeText(category.description) ?? null,
        href: `/kategorien/${encodeURIComponent(slug)}`,
        tags: ['Kategorie'],
        coverImageUrl: extractCategoryCoverUrl(category, strapiUrl),
    };
}

async function buildIndex(strapi: SearchIndexStrapi): Promise<{index: SearchIndexFile; metrics: SearchIndexMetrics}> {
    const strapiUrl = process.env.BASE_DOMAIN;
    const buildStartedAt = Date.now();

    const articlesStartedAt = Date.now();
    const articlesPromise = fetchAllDocuments(
            strapi,
            'api::article.article',
            {
                populate: {
                    cover: true,
                    banner: true,
                    categories: {
                        populate: {cover: true, banner: true},
                        fields: ['slug', 'title', 'description', 'date'],
                    },
                    authors: {fields: ['title', 'slug']},
                },
                fields: ['slug', 'publishedAt', 'content', 'title', 'description', 'date'],
            },
        )
        .then((items) => ({items, ms: Date.now() - articlesStartedAt}));

    const podcastsStartedAt = Date.now();
    const podcastsPromise = fetchAllDocuments(
        strapi,
        'api::podcast.podcast',
        {
            populate: {
                cover: true,
                banner: true,
                categories: {
                    populate: {cover: true, banner: true},
                    fields: ['slug', 'title', 'description', 'date'],
                },
                authors: {fields: ['title', 'slug']},
            },
            fields: ['slug', 'publishedAt', 'shownotes', 'title', 'description', 'date'],
        },
    ).then((items) => ({items, ms: Date.now() - podcastsStartedAt}));

    const authorsStartedAt = Date.now();
    const authorsPromise = fetchAllDocuments(
        strapi,
        'api::author.author',
        {
            populate: ['avatar'],
            fields: ['slug', 'title', 'description'],
        },
    ).then((items) => ({items, ms: Date.now() - authorsStartedAt}));

    const categoriesStartedAt = Date.now();
    const categoriesPromise = fetchAllDocuments(
        strapi,
        'api::category.category',
        {
            populate: {
                cover: true,
                banner: true,
            },
            fields: ['slug', 'title', 'description', 'date'],
        },
    ).then((items) => ({items, ms: Date.now() - categoriesStartedAt}));

    const [
        {items: articlesRaw, ms: articlesFetchMs},
        {items: podcastsRaw, ms: podcastsFetchMs},
        {items: authorsRaw, ms: authorsFetchMs},
        {items: categoriesRaw, ms: categoriesFetchMs},
    ] = await Promise.all([articlesPromise, podcastsPromise, authorsPromise, categoriesPromise]);

    strapi.log.info(`searchIndexFetch type=article count=${articlesRaw.length} fetchMs=${articlesFetchMs}`);
    strapi.log.info(`searchIndexFetch type=podcast count=${podcastsRaw.length} fetchMs=${podcastsFetchMs}`);
    strapi.log.info(`searchIndexFetch type=author count=${authorsRaw.length} fetchMs=${authorsFetchMs}`);
    strapi.log.info(`searchIndexFetch type=category count=${categoriesRaw.length} fetchMs=${categoriesFetchMs}`);

    let processingMs = 0;
    const textMetrics: PlainTextMetrics = {
        addProcessingMs: (ms) => {
            processingMs += ms;
        },
    };

    const records: SearchRecord[] = [
        ...articlesRaw.map((raw) => normalizeArticle(raw, strapiUrl, textMetrics)),
        ...podcastsRaw.map((raw) => normalizePodcast(raw, strapiUrl, textMetrics)),
        ...authorsRaw.map((raw) => normalizeAuthor(raw, strapiUrl)),
        ...categoriesRaw.map((raw) => normalizeCategory(raw, strapiUrl)),
    ].filter((record): record is SearchRecord => record !== null);

    const index = {
        version: 0,
        generatedAt: new Date().toISOString(),
        total: records.length,
        records,
    };

    const fetchTotalMs = articlesFetchMs + podcastsFetchMs + authorsFetchMs + categoriesFetchMs;
    const metrics: SearchIndexMetrics = {
        buildMs: Date.now() - buildStartedAt,
        fetchMs: {
            articles: articlesFetchMs,
            podcasts: podcastsFetchMs,
            authors: authorsFetchMs,
            categories: categoriesFetchMs,
            total: fetchTotalMs,
        },
        processingMs,
        counts: {
            articles: articlesRaw.length,
            podcasts: podcastsRaw.length,
            authors: authorsRaw.length,
            categories: categoriesRaw.length,
            total: records.length,
        },
    };

    strapi.log.info(
        `searchIndexBuild totalMs=${metrics.buildMs} fetchMs=${metrics.fetchMs.total} processingMs=${metrics.processingMs} records=${metrics.counts.total}`,
    );

    return {index, metrics};
}

// Persists the index as a Strapi single-type document with monotonically increasing version.
// Uses findFirst if available (Strapi 5), falls back to findMany (Strapi 4 compat).
async function saveIndex(strapi: SearchIndexStrapi, index: SearchIndexFile): Promise<SearchIndexFile> {
    const svc = strapi.documents('api::search-index.search-index');
    const existing: unknown = await (svc.findFirst ? svc.findFirst() : svc.findMany(documentServicePage(1, 1)));
    const list = Array.isArray(existing)
        ? existing
        : typeof existing === 'object' && existing !== null
            ? ((existing as {results?: unknown[]}).results ??
              (existing as {data?: unknown[]}).data ??
              [existing])
            : [];
    const current = (list[0] ?? null) as ExistingIndexDoc | null;
    const currentVersion = Number(current?.version) || 0;
    const nextVersion = currentVersion + 1;

    const payload = {...index, version: nextVersion};

    const existingId = current ? (current.documentId ?? current.id) : undefined;
    if (current && existingId !== undefined && existingId !== null) {
        await svc.update({
            documentId: existingId,
            data: {
                content: payload,
                version: nextVersion,
            },
        });
        return payload;
    }

    await svc.create({
        data: {
            content: payload,
            version: nextVersion,
        },
    });

    return payload;
}

/**
 * Serializes builds so the version read-modify-write in `saveIndex` cannot race:
 * the nightly cron calls `rebuildAndInvalidate` directly while a debounced
 * queue-triggered rebuild may be in flight. Without this chain, both builds read
 * the same current version, write the same next version, and one snapshot is
 * silently overwritten.
 */
let buildChain: Promise<unknown> = Promise.resolve();

export async function buildAndPersistSearchIndex(
    strapi: SearchIndexStrapi,
    options?: {source?: 'cron' | 'queue' | 'manual'},
): Promise<{index: SearchIndexFile; metrics: SearchIndexMetrics}> {
    const build = async (): Promise<{index: SearchIndexFile; metrics: SearchIndexMetrics}> => {
        const {index, metrics} = await buildIndex(strapi);
        const saved = await saveIndex(strapi, index);
        const payloadBytes = Buffer.byteLength(JSON.stringify(saved), 'utf8');
        metrics.payloadBytes = payloadBytes;
        metrics.payloadKb = Number((payloadBytes / 1024).toFixed(2));

        const snapshot: SearchIndexMetricsSnapshot = {
            ...metrics,
            updatedAt: new Date().toISOString(),
            source: options?.source,
        };

        // Clean up old metrics before adding the new snapshot to keep memory bounded.
        cleanupMetricsHistory();
        metricsHistory.unshift(snapshot);
        if (metricsHistory.length > MAX_METRICS_ENTRIES) {
            metricsHistory = metricsHistory.slice(0, MAX_METRICS_ENTRIES);
        }

        return {index: saved, metrics};
    };

    // A failed predecessor must not break the chain for later builds.
    const result = buildChain.then(build, build);
    buildChain = result.then(
        () => undefined,
        () => undefined,
    );
    return result;
}