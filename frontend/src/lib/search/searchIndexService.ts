import Fuse from 'fuse.js';

import {type SearchIndexFile, type SearchRecord} from '@/src/lib/shared/search';

import {CACHE_REVALIDATE_SEARCH} from '@/src/lib/cache/constants';
import {readApiPath} from '@/src/lib/strapi/contentAccess';
import {SEARCH_INDEX_TAG} from '@/src/lib/strapi/cacheTags';

import {getStaticPageRecords} from './staticPages';
import {isValidSearchIndexFile} from './validateSearchIndex';

export class SearchIndexFetchError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SearchIndexFetchError';
    }
}

export class SearchIndexValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SearchIndexValidationError';
    }
}

type SearchIndexCache = {
    key: string;
    fuse: Fuse<SearchRecord>;
    recordCount: number;
    builtAtMs: number;
};

let fuseCache: SearchIndexCache | null = null;

function unwrapSearchIndex(body: unknown): unknown {
    const record = body as {data?: {attributes?: {content?: unknown}; content?: unknown}; content?: unknown};
    const data = record?.data ?? body;
    const attrs = (data as {attributes?: {content?: unknown}})?.attributes ?? data;
    return (attrs as {content?: unknown})?.content ?? (body as {content?: unknown})?.content ?? body;
}

export async function loadSearchIndex(): Promise<SearchIndexFile> {
    let json: unknown;
    try {
        json = await readApiPath<unknown>('/api/search-index', {
            tags: [SEARCH_INDEX_TAG],
            auth: 'privileged',
            revalidate: CACHE_REVALIDATE_SEARCH,
            diagnosticName: 'strapi.search-index',
        });
    } catch (err) {
        throw new SearchIndexFetchError(err instanceof Error ? err.message : 'Failed to fetch search index');
    }

    const content = unwrapSearchIndex(json);

    if (!content || typeof content !== 'object') {
        throw new SearchIndexValidationError('Malformed search index: content is not an object');
    }

    if (!isValidSearchIndexFile(content)) {
        throw new SearchIndexValidationError('Malformed search index: invalid structure');
    }

    return content;
}

export function buildFuse(records: SearchRecord[]): Fuse<SearchRecord> {
    return new Fuse(records, {
        includeScore: true,
        shouldSort: true,
        ignoreLocation: true,
        minMatchCharLength: 2,
        threshold: 0.35,
        keys: [
            {name: 'title', weight: 0.52},
            {name: 'description', weight: 0.18},
            {name: 'content', weight: 0.22},
            {name: 'tags', weight: 0.3},
        ],
    });
}

function getIndexKey(index: SearchIndexFile): string {
    return `${index.version}:${index.generatedAt}`;
}

export function getCachedFuse(index: SearchIndexFile): Fuse<SearchRecord> {
    const now = Date.now();
    const key = getIndexKey(index);
    const ttlMs = Math.min(CACHE_REVALIDATE_SEARCH * 1000, 5 * 60_000);

    if (
        fuseCache &&
        fuseCache.key === key &&
        now - fuseCache.builtAtMs < ttlMs &&
        fuseCache.recordCount === index.records.length
    ) {
        return fuseCache.fuse;
    }

    const fuse = buildFuse(index.records);
    fuseCache = {key, fuse, recordCount: index.records.length, builtAtMs: now};
    return fuse;
}

export function augmentIndexWithStaticPages(index: SearchIndexFile): SearchIndexFile {
    const staticRecords = getStaticPageRecords();
    return {
        ...index,
        records: [...index.records, ...staticRecords],
        total: index.records.length + staticRecords.length,
    };
}

export function stripRecordContent(records: SearchRecord[]): Omit<SearchRecord, 'content'>[] {
    return records.map(({content: _content, ...rest}) => rest);
}

/** Reset in-memory Fuse cache (for tests). */
export function resetSearchIndexCache(): void {
    fuseCache = null;
}
