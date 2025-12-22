import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {loadEnvConfig} from '@next/env';
import qs from 'qs';

import {type SearchIndexFile, type SearchRecord} from '@/src/lib/search/types';

type StrapiPagination = {
    page?: number;
    pageSize?: number;
    pageCount?: number;
    total?: number;
};

type StrapiListResponse<T> = {
    data: T[];
    meta?: {
        pagination?: StrapiPagination;
    };
};

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnvConfig(projectRoot);

const PAGE_SIZE = 100;
const OUTPUT_FILE = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'public',
    'index',
    'search.json',
);

function getEnv(name: string): string | undefined {
    const v = process.env[name];
    return v && v.length > 0 ? v : undefined;
}

function getStrapiBaseUrl(): string {
    const raw = getEnv('STRAPI_API_URL') ?? getEnv('NEXT_PUBLIC_STRAPI_URL');
    if (!raw) {
        throw new Error('Missing STRAPI_API_URL or NEXT_PUBLIC_STRAPI_URL');
    }
    const url = new URL(raw);
    return url.toString().replace(/\/+$/, '');
}

function getAuthHeader(): Record<string, string> | undefined {
    const token = getEnv('STRAPI_API_TOKEN');
    if (token) {
        return {Authorization: `Bearer ${token}`};
    }
    return undefined;
}

/**
 * Strapi sometimes wraps entries in {id, attributes}. This unwraps the common shape
 * while preserving id/documentId when present.
 */
function unwrapEntry<T extends {id?: unknown; documentId?: unknown; attributes?: Record<string, unknown>}>(entry: T): any {
    if (!entry) return entry;
    if (entry.attributes && typeof entry.attributes === 'object') {
        return {
            id: (entry as any).id,
            documentId: (entry as any).documentId,
            ...entry.attributes,
        };
    }
    return entry;
}

async function fetchPaginated<T>(apiPath: string, query: Record<string, unknown>, label: string): Promise<T[]> {
    const baseUrl = getStrapiBaseUrl();
    const headers = getAuthHeader();
    const items: T[] = [];
    let page = 1;

    // Paginate until Strapi reports that all pages are exhausted.
    while (true) {
        const queryWithPagination = {
            ...query,
            pagination: {page, pageSize: PAGE_SIZE},
        };
        const queryString = qs.stringify(queryWithPagination, {encodeValuesOnly: true});
        const url = new URL(`/api/${apiPath}?${queryString}`, baseUrl);

        const res = await fetch(url.toString(), {headers});
        if (!res.ok) {
            throw new Error(`Failed to fetch ${label} page ${page}: ${res.status} ${res.statusText}`);
        }

        const json = (await res.json()) as StrapiListResponse<T>;
        if (!Array.isArray(json.data)) {
            throw new Error(`Unexpected ${label} response shape (missing data array)`);
        }

        items.push(...json.data);

        const pageCount = json.meta?.pagination?.pageCount ?? 1;
        if (page >= pageCount) break;
        page += 1;
    }

    return items;
}

function safeText(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim().length > 0) return value;
    return undefined;
}

function toPlainText(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const text = value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length === 0) return undefined;
    // Cap to avoid oversized records
    return text.slice(0, 5000);
}

function normalizeArticle(raw: any): SearchRecord | null {
    const article = unwrapEntry(raw);
    const slug = safeText(article?.slug);
    const title = safeText(article?.base?.title);
    if (!slug || !title) return null;

    const description = safeText(article?.base?.description) ?? null;
    const content = toPlainText(article?.content) ?? null;
    const categories: string[] =
        article?.categories
            ?.map((c: any) => unwrapEntry(c))
            ?.map((c: any) => safeText(c?.base?.title) ?? safeText(c?.slug))
            ?.filter(Boolean) ?? [];
    const authors: string[] =
        article?.authors?.map((a: any) => unwrapEntry(a)).map((a: any) => safeText(a?.title) ?? safeText(a?.slug)).filter(Boolean) ??
        [];

    return {
        id: `article:${slug}`,
        type: 'article',
        slug,
        title,
        description,
        content,
        href: `/artikel/${encodeURIComponent(slug)}`,
        publishedAt: safeText(article?.publishedAt) ?? null,
        tags: [...new Set<string>(['Artikel', ...categories, ...authors].filter(Boolean))],
    };
}

function normalizePodcast(raw: any): SearchRecord | null {
    const podcast = unwrapEntry(raw);
    const slug = safeText(podcast?.slug);
    const title = safeText(podcast?.base?.title);
    if (!slug || !title) return null;

    const description = safeText(podcast?.base?.description) ?? null;
    const content = toPlainText(podcast?.shownotes) ?? null;
    const categories: string[] =
        podcast?.categories
            ?.map((c: any) => unwrapEntry(c))
            ?.map((c: any) => safeText(c?.base?.title) ?? safeText(c?.slug))
            ?.filter(Boolean) ?? [];
    const authors: string[] =
        podcast?.authors?.map((a: any) => unwrapEntry(a)).map((a: any) => safeText(a?.title) ?? safeText(a?.slug)).filter(Boolean) ??
        [];

    return {
        id: `podcast:${slug}`,
        type: 'podcast',
        slug,
        title,
        description,
        content,
        href: `/podcasts/${encodeURIComponent(slug)}`,
        publishedAt: safeText(podcast?.publishedAt) ?? null,
        tags: [...new Set<string>(['Podcast', ...categories, ...authors].filter(Boolean))],
    };
}

function normalizeAuthor(raw: any): SearchRecord | null {
    const author = unwrapEntry(raw);
    const slug = safeText(author?.slug);
    const title = safeText(author?.title);
    if (!slug || !title) return null;

    const description = safeText(author?.description) ?? null;

    return {
        id: `author:${slug}`,
        type: 'author',
        slug,
        title,
        description,
        href: `/team/${encodeURIComponent(slug)}`,
        tags: ['Autor'],
    };
}

function normalizeCategory(raw: any): SearchRecord | null {
    const category = unwrapEntry(raw);
    const slug = safeText(category?.slug);
    const title = safeText(category?.base?.title) ?? safeText(category?.title) ?? slug;
    if (!slug || !title) return null;

    const description = safeText(category?.base?.description) ?? null;

    return {
        id: `category:${slug}`,
        type: 'category',
        slug,
        title,
        description,
        href: `/kategorien/${encodeURIComponent(slug)}`,
        tags: ['Kategorie'],
    };
}

async function buildIndex(): Promise<SearchIndexFile> {
    const [articlesRaw, podcastsRaw, authorsRaw, categoriesRaw] = await Promise.all([
        fetchPaginated(
            'articles',
            {
                status: 'published',
                populate: {
                    base: {fields: ['title', 'description']},
                    categories: {populate: {base: {fields: ['title']}}, fields: ['slug']},
                    authors: {fields: ['title', 'slug']},
                },
                fields: ['slug', 'publishedAt', 'content'],
            },
            'articles',
        ),
        fetchPaginated(
            'podcasts',
            {
                status: 'published',
                populate: {
                    base: {fields: ['title', 'description']},
                    categories: {populate: {base: {fields: ['title']}}, fields: ['slug']},
                    authors: {fields: ['title', 'slug']},
                },
                fields: ['slug', 'publishedAt', 'shownotes'],
            },
            'podcasts',
        ),
        fetchPaginated(
            'authors',
            {
                populate: ['avatar'],
                fields: ['slug', 'title', 'description'],
            },
            'authors',
        ),
        fetchPaginated(
            'categories',
            {
                populate: {base: {fields: ['title', 'description']}},
                fields: ['slug'],
            },
            'categories',
        ),
    ]);

    const records: SearchRecord[] = [
        ...articlesRaw.map(normalizeArticle),
        ...podcastsRaw.map(normalizePodcast),
        ...authorsRaw.map(normalizeAuthor),
        ...categoriesRaw.map(normalizeCategory),
    ].filter(Boolean) as SearchRecord[];

    return {
        version: 2,
        generatedAt: new Date().toISOString(),
        total: records.length,
        records,
    };
}

async function writeIndexFile(index: SearchIndexFile) {
    const dir = path.dirname(OUTPUT_FILE);
    await fs.mkdir(dir, {recursive: true});
    const body = JSON.stringify(index, null, 2);
    await fs.writeFile(OUTPUT_FILE, body, 'utf8');
    // eslint-disable-next-line no-console
    console.log(`Wrote ${index.records.length} records to ${OUTPUT_FILE}`);
}

async function main() {
    const index = await buildIndex();
    await writeIndexFile(index);
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to build search index', err);
    process.exitCode = 1;
});


