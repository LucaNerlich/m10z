'use client';

import Fuse from 'fuse.js';

import {type SearchIndexFile, type SearchRecord} from './types';

const INDEX_URL = '/api/search-index';
const CACHE_TTL_MS = 600000; // 10 minutes

type SearchResult = SearchRecord & {score?: number | null};

let fusePromise: Promise<Fuse<SearchRecord>> | null = null;
let lastFetchTime: number | null = null;

async function loadIndex(): Promise<SearchIndexFile> {
    const res = await fetch(INDEX_URL, {cache: 'force-cache'});
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
    // Check if cache has expired
    if (lastFetchTime !== null && Date.now() - lastFetchTime > CACHE_TTL_MS) {
        if (process.env.NODE_ENV === 'development') {
            console.debug('[fuseClient] DEV Cache expired, resetting');
        }
        fusePromise = null;
        lastFetchTime = null;
    }

    if (!fusePromise) {
        if (process.env.NODE_ENV === 'development') {
            console.debug('[fuseClient] DEV Starting new fetch');
        }
        lastFetchTime = Date.now();
        fusePromise = loadIndex()
            .then((index) => buildFuse(index.records))
            .catch((error) => {
                // Reset cache on error to allow retry on next call
                fusePromise = null;
                lastFetchTime = null;
                throw error;
            });
    } else {
        if (process.env.NODE_ENV === 'development') {
            console.debug('[fuseClient] DEV Using cached instance');
        }
    }
    return fusePromise;
}

export async function searchIndex(query: string, limit = 12): Promise<SearchResult[]> {
    const q = query.trim();
    if (q.length === 0) return [];

    const fuse = await getFuse();
    return fuse.search(q, {limit}).map((match) => ({
        ...match.item,
        score: match.score ?? null,
    }));
}

/**
 * Useful when we want to force a reload (e.g., after invalidation).
 */
export function resetSearchCache() {
    fusePromise = null;
}

/**
 * Invalidates the Fuse cache by resetting both the promise and fetch time.
 * This ensures a fresh fetch on the next search request.
 */
export function invalidateFuseCache() {
    fusePromise = null;
    lastFetchTime = null;
}


