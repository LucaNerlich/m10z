import markdownToTxt from 'markdown-to-txt';

type Strapi = {
    documents: (
        uid: string,
    ) => {
        findMany: (params?: Record<string, unknown>) => Promise<any>;
        findFirst?: (params?: Record<string, unknown>) => Promise<any>;
        update: (params: {documentId: string | number; data: Record<string, unknown>}) => Promise<any>;
        create: (params: {data: Record<string, unknown>}) => Promise<any>;
    };
    log: {
        info: (message: string) => void;
    };
};

type SearchRecordType = 'article' | 'podcast' | 'author' | 'category';

type SearchRecord = {
    id: string;
    type: SearchRecordType;
    slug: string;
    title: string;
    description?: string | null;
    content?: string | null;
    href: string;
    publishedAt?: string | null;
    tags: string[];
    coverImageUrl?: string | null;
};

type SearchIndexFile = {
    version: number;
    generatedAt: string;
    total: number;
    records: SearchRecord[];
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
    let fromTs: number | null = null;
    let toTs: number | null = null;

    if (from) {
        const parsed = Date.parse(from);
        if (!Number.isNaN(parsed)) fromTs = parsed;
    }

    if (to) {
        const parsed = Date.parse(to);
        if (!Number.isNaN(parsed)) toTs = parsed;
    }

    let normalizedLimit = Number(limit);
    if (!Number.isFinite(normalizedLimit) || normalizedLimit <= 0) {
        normalizedLimit = 30;
    }
    if (normalizedLimit > MAX_METRICS_ENTRIES) {
        normalizedLimit = MAX_METRICS_ENTRIES;
    }

    const filtered = metricsHistory.filter((entry) => {
        const ts = Date.parse(entry.updatedAt);
        if (Number.isNaN(ts)) return false;
        if (fromTs !== null && ts < fromTs) return false;
        if (toTs !== null && ts > toTs) return false;
        return true;
    });

    return filtered.slice(0, normalizedLimit);
}
type PlainTextMetrics = {
    addProcessingMs: (ms: number) => void;
};

const PAGE_SIZE = 100;
const DEFAULT_MAX_LEN = 5000;

function getMaxLen(): number {
    const raw = process.env.SEARCH_INDEX_MAX_LEN;
    if (!raw) return DEFAULT_MAX_LEN;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.min(n, 50_000);
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

function effectiveDate(raw: any): string | null {
    const override = safeText(raw?.base?.date);
    if (override) return override;
    return safeText(raw?.publishedAt) ?? null;
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

function extractMediaUrl(mediaRef: any, strapiUrl?: string): string | null {
    if (!strapiUrl || !mediaRef) return null;

    const media = unwrapEntry(mediaRef);
    const url = media?.url ?? media?.data?.attributes?.url ?? media?.attributes?.url;
    if (!url || typeof url !== 'string' || url.trim().length === 0) return null;

    if (/^https?:\/\//i.test(url)) return url;
    const trimmedBase = strapiUrl.replace(/\/+$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${trimmedBase}${path}`;
}

function extractCoverImageUrl(raw: any, strapiUrl?: string): string | null {
    if (!strapiUrl) return null;

    // Try to get cover from entity.base.cover first
    const baseCover = raw?.base?.cover;
    if (baseCover) {
        const url = extractMediaUrl(baseCover, strapiUrl);
        if (url) return url;
    }

    // Fallback to first category's cover if entity.base.cover is not set
    const firstCategory = raw?.categories?.[0];
    if (firstCategory) {
        const category = unwrapEntry(firstCategory);
        const categoryCover = category?.base?.cover;
        if (categoryCover) {
            const url = extractMediaUrl(categoryCover, strapiUrl);
            if (url) return url;
        }
    }

    return null;
}

function extractAuthorAvatarUrl(raw: any, strapiUrl?: string): string | null {
    if (!strapiUrl) return null;

    const avatar = raw?.avatar;
    if (avatar) {
        return extractMediaUrl(avatar, strapiUrl);
    }

    return null;
}

function extractCategoryCoverUrl(raw: any, strapiUrl?: string): string | null {
    if (!strapiUrl) return null;

    const baseCover = raw?.base?.cover;
    if (baseCover) {
        return extractMediaUrl(baseCover, strapiUrl);
    }

    return null;
}

function unwrapEntry<T extends {attributes?: Record<string, unknown>}>(entry: T): any {
    if (!entry) return entry;
    if (entry.attributes && typeof entry.attributes === 'object') {
        return {...entry.attributes, id: (entry as any).id, documentId: (entry as any).documentId};
    }
    return entry;
}

async function fetchAllDocuments<T>(
    strapi: Strapi,
    uid: string,
    params: Record<string, unknown>,
): Promise<T[]> {
    const items: T[] = [];
    let page = 1;

    while (true) {
        const res = await strapi.documents(uid).findMany({
            status: 'published',
            pagination: {page, pageSize: PAGE_SIZE},
            ...params,
        });

        const results: T[] = Array.isArray(res) ? res : res?.results ?? res?.data ?? [];
        items.push(...results);

        const pagination = res?.pagination ?? res?.meta?.pagination;
        const pageCount = pagination?.pageCount ?? 1;
        if (page >= pageCount) break;
        page += 1;
    }

    return items;
}

function normalizeArticle(raw: any, strapiUrl?: string, metrics?: PlainTextMetrics): SearchRecord | null {
    const article = unwrapEntry(raw);
    const slug = safeText(article?.slug);
    const title = sanitizeText(article?.base?.title);
    if (!slug || !title) return null;

    const description = sanitizeText(article?.base?.description) ?? null;
    const content = toPlainText(article?.content, metrics) ?? null;
    const categories: string[] =
        article?.categories
            ?.map((c: any) => unwrapEntry(c))
            ?.map((c: any) => sanitizeText(c?.base?.title) ?? sanitizeText(c?.slug))
            ?.filter(Boolean) ?? [];
    const authors: string[] =
        article?.authors
            ?.map((a: any) => unwrapEntry(a))
            .map((a: any) => sanitizeText(a?.title) ?? sanitizeText(a?.slug))
            .filter(Boolean) ??
        [];

    return {
        id: `article:${slug}`,
        type: 'article',
        slug,
        title,
        description,
        content,
        href: `/artikel/${encodeURIComponent(slug)}`,
        publishedAt: effectiveDate(article),
        tags: [...new Set<string>(['Artikel', ...categories, ...authors].filter(Boolean))],
        coverImageUrl: extractCoverImageUrl(article, strapiUrl),
    };
}

function normalizePodcast(raw: any, strapiUrl?: string, metrics?: PlainTextMetrics): SearchRecord | null {
    const podcast = unwrapEntry(raw);
    const slug = safeText(podcast?.slug);
    const title = sanitizeText(podcast?.base?.title);
    if (!slug || !title) return null;

    const description = sanitizeText(podcast?.base?.description) ?? null;
    const content = toPlainText(podcast?.shownotes, metrics) ?? null;
    const categories: string[] =
        podcast?.categories
            ?.map((c: any) => unwrapEntry(c))
            ?.map((c: any) => sanitizeText(c?.base?.title) ?? sanitizeText(c?.slug))
            ?.filter(Boolean) ?? [];
    const authors: string[] =
        podcast?.authors
            ?.map((a: any) => unwrapEntry(a))
            .map((a: any) => sanitizeText(a?.title) ?? sanitizeText(a?.slug))
            .filter(Boolean) ??
        [];

    return {
        id: `podcast:${slug}`,
        type: 'podcast',
        slug,
        title,
        description,
        content,
        href: `/podcasts/${encodeURIComponent(slug)}`,
        publishedAt: effectiveDate(podcast),
        tags: [...new Set<string>(['Podcast', ...categories, ...authors].filter(Boolean))],
        coverImageUrl: extractCoverImageUrl(podcast, strapiUrl),
    };
}

function normalizeAuthor(raw: any, strapiUrl?: string): SearchRecord | null {
    const author = unwrapEntry(raw);
    const slug = safeText(author?.slug);
    const title = sanitizeText(author?.title);
    if (!slug || !title) return null;

    const description = sanitizeText(author?.description) ?? null;

    return {
        id: `author:${slug}`,
        type: 'author',
        slug,
        title,
        description,
        href: `/team/${encodeURIComponent(slug)}`,
        tags: ['Autor-In'],
        coverImageUrl: extractAuthorAvatarUrl(author, strapiUrl),
    };
}

function normalizeCategory(raw: any, strapiUrl?: string): SearchRecord | null {
    const category = unwrapEntry(raw);
    const slug = safeText(category?.slug);
    const title = sanitizeText(category?.base?.title) ?? sanitizeText(category?.title) ?? slug;
    if (!slug || !title) return null;

    const description = sanitizeText(category?.base?.description) ?? null;

    return {
        id: `category:${slug}`,
        type: 'category',
        slug,
        title,
        description,
        href: `/kategorien/${encodeURIComponent(slug)}`,
        tags: ['Kategorie'],
        coverImageUrl: extractCategoryCoverUrl(category, strapiUrl),
    };
}

async function buildIndex(strapi: Strapi): Promise<{index: SearchIndexFile; metrics: SearchIndexMetrics}> {
    const strapiUrl = process.env.BASE_DOMAIN;
    const buildStartedAt = Date.now();

    const articlesStartedAt = Date.now();
    const articlesPromise = fetchAllDocuments(
            strapi,
            'api::article.article',
            {
                populate: {
                    base: {populate: ['cover'], fields: ['title', 'description', 'date']},
                    categories: {
                        populate: {base: {populate: ['cover'], fields: ['title']}},
                        fields: ['slug'],
                    },
                    authors: {fields: ['title', 'slug']},
                },
                fields: ['slug', 'publishedAt', 'content'],
            },
        )
        .then((items) => ({items, ms: Date.now() - articlesStartedAt}));

    const podcastsStartedAt = Date.now();
    const podcastsPromise = fetchAllDocuments(
        strapi,
        'api::podcast.podcast',
        {
            populate: {
                base: {populate: ['cover'], fields: ['title', 'description', 'date']},
                categories: {
                    populate: {base: {populate: ['cover'], fields: ['title']}},
                    fields: ['slug'],
                },
                authors: {fields: ['title', 'slug']},
            },
            fields: ['slug', 'publishedAt', 'shownotes'],
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
            populate: {base: {populate: ['cover'], fields: ['title', 'description']}},
            fields: ['slug'],
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
    ].filter(Boolean) as SearchRecord[];

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

async function saveIndex(strapi: Strapi, index: SearchIndexFile): Promise<SearchIndexFile> {
    const svc = strapi.documents('api::search-index.search-index');
    const existing = (await (svc.findFirst ? svc.findFirst() : svc.findMany({pagination: {pageSize: 1}}))) as any;
    const current = Array.isArray(existing) ? existing[0] : existing?.results?.[0] ?? existing?.data?.[0] ?? existing;
    const currentVersion = Number(current?.version) || 0;
    const nextVersion = currentVersion + 1;

    const payload = {...index, version: nextVersion};

    if (current && (current.documentId || current.id)) {
        await svc.update({
            documentId: current.documentId ?? current.id,
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

export async function buildAndPersistSearchIndex(
    strapi: Strapi,
    options?: {source?: 'cron' | 'queue' | 'manual'},
): Promise<{index: SearchIndexFile; metrics: SearchIndexMetrics}> {
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
}