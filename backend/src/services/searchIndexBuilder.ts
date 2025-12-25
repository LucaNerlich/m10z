import {JSDOM} from 'jsdom';
import createDOMPurify from 'dompurify';
import {marked} from 'marked';

const window = new JSDOM('').window;
// DOMPurify's TS types expect a WindowLike. JSDOM's window is compatible at runtime.
// Cast to avoid type mismatch between DOMPurify and JSDOM type definitions.
const DOMPurify = createDOMPurify(window as any);

type Strapi = {
    documents: (
        uid: string,
    ) => {
        findMany: (params?: Record<string, unknown>) => Promise<any>;
        findFirst?: (params?: Record<string, unknown>) => Promise<any>;
        update: (params: {documentId: string | number; data: Record<string, unknown>}) => Promise<any>;
        create: (params: {data: Record<string, unknown>}) => Promise<any>;
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

function toPlainText(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;

    let html: string;

    // Check if content is markdown (contains markdown syntax) or already HTML
    // Convert markdown to HTML first, then sanitize
    try {
        // Try parsing as markdown first (marked.parse handles both markdown and HTML)
        // If it's already HTML, marked will pass it through mostly unchanged
        html = marked.parse(value, {
            gfm: true,
            breaks: true,
        }) as string;
    } catch {
        // If parsing fails, treat as plain HTML
        html = value;
    }

    // Sanitize HTML using DOMPurify to prevent XSS and safely extract text content
    // Strip all HTML tags and attributes, only keep text content
    const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
    });

    // Normalize whitespace and trim
    const text = sanitized.replace(/\s+/g, ' ').trim();
    if (text.length === 0) return undefined;

    // Cap to avoid oversized records
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

function normalizeArticle(raw: any, strapiUrl?: string): SearchRecord | null {
    const article = unwrapEntry(raw);
    const slug = safeText(article?.slug);
    const title = sanitizeText(article?.base?.title);
    if (!slug || !title) return null;

    const description = sanitizeText(article?.base?.description) ?? null;
    const content = toPlainText(article?.content) ?? null;
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

function normalizePodcast(raw: any, strapiUrl?: string): SearchRecord | null {
    const podcast = unwrapEntry(raw);
    const slug = safeText(podcast?.slug);
    const title = sanitizeText(podcast?.base?.title);
    if (!slug || !title) return null;

    const description = sanitizeText(podcast?.base?.description) ?? null;
    const content = toPlainText(podcast?.shownotes) ?? null;
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

async function buildIndex(strapi: Strapi): Promise<SearchIndexFile> {
    const strapiUrl = process.env.BASE_DOMAIN;

    const [articlesRaw, podcastsRaw, authorsRaw, categoriesRaw] = await Promise.all([
        fetchAllDocuments(
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
        ),
        fetchAllDocuments(
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
        ),
        fetchAllDocuments(
            strapi,
            'api::author.author',
            {
                populate: ['avatar'],
                fields: ['slug', 'title', 'description'],
            },
        ),
        fetchAllDocuments(
            strapi,
            'api::category.category',
            {
                populate: {base: {populate: ['cover'], fields: ['title', 'description']}},
                fields: ['slug'],
            },
        ),
    ]);

    const records: SearchRecord[] = [
        ...articlesRaw.map((raw) => normalizeArticle(raw, strapiUrl)),
        ...podcastsRaw.map((raw) => normalizePodcast(raw, strapiUrl)),
        ...authorsRaw.map((raw) => normalizeAuthor(raw, strapiUrl)),
        ...categoriesRaw.map((raw) => normalizeCategory(raw, strapiUrl)),
    ].filter(Boolean) as SearchRecord[];

    return {
        version: 0,
        generatedAt: new Date().toISOString(),
        total: records.length,
        records,
    };
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

export async function buildAndPersistSearchIndex(strapi: Strapi): Promise<SearchIndexFile> {
    const index = await buildIndex(strapi);
    return await saveIndex(strapi, index);
}

