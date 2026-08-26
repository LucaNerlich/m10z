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

// The /api/search-index endpoint wraps the generated index in a Strapi
// single-type envelope: `{data: {attributes: {content: <index>}}}`. Older
// deployments served the index flat (`{content: <index>}` or the bare index),
// so all three shapes are unwrapped in order.
type SearchIndexApiEnvelope = {
    data?: {attributes?: {content?: unknown}} | null;
    content?: unknown;
};

type SearchIndexApiWrapper = {
    attributes?: {content?: unknown} | null;
    content?: unknown;
};

/**
 * Unwrap the search index from its Strapi envelope. Prefers
 * `data.attributes.content`, then `data.content`, then a top-level `content`,
 * and finally returns the body unchanged (which the caller validates).
 */
function unwrapSearchIndex(body: unknown): unknown {
    if (typeof body !== 'object' || body === null) return body;
    const envelope = body as SearchIndexApiEnvelope;

    const data: unknown = envelope.data ?? body;
    if (typeof data === 'object' && data !== null) {
        const dataWrapper = data as SearchIndexApiWrapper;
        const attrs: unknown = dataWrapper.attributes ?? data;
        if (typeof attrs === 'object' && attrs !== null) {
            const content = (attrs as SearchIndexApiWrapper).content;
            if (content !== undefined && content !== null) return content;
        }
    }

    return envelope.content ?? body;
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

function buildFuse(records: SearchRecord[]): Fuse<SearchRecord> {
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
