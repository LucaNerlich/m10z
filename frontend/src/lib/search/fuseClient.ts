'use client';

import Fuse from 'fuse.js';

import {type SearchIndexFile, type SearchRecord} from './types';

const INDEX_URL = '/index/search.json';

type SearchResult = SearchRecord & {score?: number | null};

let fusePromise: Promise<Fuse<SearchRecord>> | null = null;

async function loadIndex(): Promise<SearchIndexFile> {
    const res = await fetch(INDEX_URL, {cache: 'force-cache'});
    if (!res.ok) {
        throw new Error(`Failed to load search index: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as SearchIndexFile;
    return json;
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
    if (!fusePromise) {
        fusePromise = loadIndex()
            .then((index) => buildFuse(index.records))
            .catch((error) => {
                // Reset cache on error to allow retry on next call
                fusePromise = null;
                throw error;
            });
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


