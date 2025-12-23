import {NextResponse} from 'next/server';
import Fuse from 'fuse.js';

import {getStrapiApiBaseUrl} from '@/src/lib/strapi';
import {type SearchIndexFile, type SearchRecord} from '@/src/lib/search/types';

function getAuthHeader(): Record<string, string> | undefined {
    const token = process.env.STRAPI_API_TOKEN;
    if (!token) return undefined;
    return {Authorization: `Bearer ${token}`};
}

function unwrapSearchIndex(body: any) {
    const data = body?.data ?? body;
    const attrs = data?.attributes ?? data;
    return attrs?.content ?? body?.content ?? body;
}

async function loadSearchIndex(): Promise<SearchIndexFile> {
    const base = getStrapiApiBaseUrl();
    const url = new URL('/api/search-index', base);

    const res = await fetch(url, {
        headers: getAuthHeader(),
        next: {revalidate: 3600, tags: ['search-index']},
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch search index: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const content = unwrapSearchIndex(json);

    if (!content || typeof content !== 'object') {
        throw new Error('Malformed search index');
    }

    return content as SearchIndexFile;
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

export async function GET(request: Request) {
    const {searchParams} = new URL(request.url);
    const query = searchParams.get('q');

    // If no query parameter, return the full index (existing behavior)
    if (!query) {
        const base = getStrapiApiBaseUrl();
        const url = new URL('/api/search-index', base);

        const res = await fetch(url, {
            headers: getAuthHeader(),
            next: {revalidate: 3600, tags: ['search-index']},
        });

        if (!res.ok) {
            return NextResponse.json({error: 'Failed to fetch search index'}, {status: 502});
        }

        const json = await res.json();
        const content = unwrapSearchIndex(json);

        if (!content || typeof content !== 'object') {
            return NextResponse.json({error: 'Malformed search index'}, {status: 500});
        }

        return NextResponse.json(content, {
            headers: {
                'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
            },
        });
    }

    // Perform search with query parameter
    try {
        const trimmedQuery = query.trim();
        if (trimmedQuery.length === 0) {
            return NextResponse.json({results: [], total: 0});
        }

        const index = await loadSearchIndex();
        const fuse = buildFuse(index.records);
        const results = fuse.search(trimmedQuery, {limit: 20}).map((match) => ({
            ...match.item,
            score: match.score ?? null,
        }));

        return NextResponse.json(
            {
                results,
                total: results.length,
                query: trimmedQuery,
            },
            {
                headers: {
                    'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
                },
            },
        );
    } catch (error) {
        console.error('[search-index] Search error:', error);
        return NextResponse.json(
            {error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error'},
            {status: 500},
        );
    }
}
