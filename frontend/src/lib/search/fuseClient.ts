'use client';

/**
 * @deprecated This module is deprecated. Use the SWR hooks instead:
 * - `useSearchIndex()` for fetching the full search index
 * - `useSearchQuery(query)` for performing search queries
 *
 * The search functionality now uses the `/api/search-index` endpoint directly
 * via SWR hooks, which provides automatic caching, deduplication, and better
 * error handling.
 */

import Fuse from 'fuse.js';

import {type SearchIndexFile, type SearchRecord} from './types';

const INDEX_URL = '/api/search-index';

type SearchResult = SearchRecord & {score?: number | null};

async function loadIndex(): Promise<SearchIndexFile> {
    const res = await fetch(INDEX_URL);
    if (!res.ok) {
        throw new Error(`Failed to load search index: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as SearchIndexFile;
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

async function getFuse(): Promise<Fuse<SearchRecord>> {
    const index = await loadIndex();
    return buildFuse(index.records);
}

/**
 * @deprecated Use `useSearchQuery(query)` hook instead for better caching and error handling.
 */
export async function searchIndex(query: string, limit = 12): Promise<SearchResult[]> {
    const q = query.trim();
    if (q.length === 0) return [];

    const fuse = await getFuse();
    return fuse.search(q, {limit}).map((match) => ({
        ...match.item,
        score: match.score ?? null,
    }));
}


