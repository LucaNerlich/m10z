import {NextResponse} from 'next/server';
import Fuse from 'fuse.js';

import {getStrapiApiBaseUrl} from '@/src/lib/strapi';
import {type SearchIndexFile, type SearchRecord} from '@/src/lib/search/types';

/**
 * Return an Authorization header object using the STRAPI_API_TOKEN environment variable when available.
 *
 * @returns An object with an `Authorization` header set to `Bearer <token>`, or `undefined` if `STRAPI_API_TOKEN` is not set.
 */
function getAuthHeader(): Record<string, string> | undefined {
    const token = process.env.STRAPI_API_TOKEN;
    if (!token) return undefined;
    return {Authorization: `Bearer ${token}`};
}

/**
 * Extracts the search index `content` from a Strapi-like response or returns the body unchanged.
 *
 * @param body - The response payload which may be a Strapi wrapper (with `data.attributes.content`), an object with `content`, or the raw index content.
 * @returns The extracted `content` value when present (checked from `data.attributes.content` then `body.content`), otherwise the original `body`.
 */
function unwrapSearchIndex(body: any) {
    const data = body?.data ?? body;
    const attrs = data?.attributes ?? data;
    return attrs?.content ?? body?.content ?? body;
}

/**
 * Loads and returns the search index file from the Strapi API.
 *
 * @returns The parsed search index content as a `SearchIndexFile`
 * @throws Error if the HTTP request returns a non-OK status
 * @throws Error if the fetched payload is missing or not an object (malformed search index)
 */
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

/**
 * Creates a Fuse search index for the given records configured for weighted fuzzy matching.
 *
 * @param records - The list of search records to index
 * @returns A Fuse instance configured to perform weighted fuzzy searches across `title`, `description`, `content`, and `tags`
 */
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

/**
 * Handle GET requests for the search-index endpoint, returning either the full index or search results based on the `q` query parameter.
 *
 * @param request - Incoming HTTP request. If the `q` query parameter is omitted, the full search index is returned; if present, a search is performed using its trimmed value.
 * @returns When `q` is not provided: the full search index object. When `q` is provided: an object with `results` (array of matched records with `score`), `total` (number of results), and `query` (the trimmed search string). On failure returns a JSON error object describing the problem.
 */
export async function GET(request: Request) {
    const {searchParams} = new URL(request.url);
    const query = searchParams.get('q');

    // If no query parameter, return the full index (existing behavior)
    if (!query) {
        try {
            const content = await loadSearchIndex();
            return NextResponse.json(content, {
                headers: {
                    'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
                },
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage.includes('Failed to fetch search index')) {
                return NextResponse.json({error: 'Failed to fetch search index'}, {status: 502});
            }
            if (errorMessage === 'Malformed search index') {
                return NextResponse.json({error: 'Malformed search index'}, {status: 500});
            }
            return NextResponse.json({error: 'Failed to fetch search index'}, {status: 500});
        }
    }

    // Perform search with query parameter
    try {
        const trimmedQuery = query.trim();
        if (trimmedQuery.length === 0) {
            return NextResponse.json({results: [], total: 0});
        }
        if (trimmedQuery.length > 200) {
            return NextResponse.json({error: 'Query too long'}, {status: 400});
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