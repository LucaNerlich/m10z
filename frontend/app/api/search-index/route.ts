import {NextResponse} from 'next/server';
import Fuse from 'fuse.js';

import {getStrapiApiBaseUrl} from '@/src/lib/strapi';
import {type SearchIndexFile, type SearchRecord, type SearchRecordType} from '@/src/lib/search/types';

/**
 * Custom error class for fetch-related errors.
 */
class FetchError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FetchError';
    }
}

/**
 * Custom error class for validation errors.
 */
class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

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
 * Validates that the given object matches the SearchIndexFile structure.
 *
 * @param obj - The object to validate
 * @returns `true` if the object is a valid SearchIndexFile, `false` otherwise
 */
function isValidSearchIndexFile(obj: unknown): obj is SearchIndexFile {
    if (!obj || typeof obj !== 'object') return false;

    const candidate = obj as Record<string, unknown>;

    // Validate version (must be a number)
    if (typeof candidate.version !== 'number' || !Number.isFinite(candidate.version)) return false;

    // Validate generatedAt (ISO 8601 string)
    if (typeof candidate.generatedAt !== 'string' || !candidate.generatedAt) return false;
    if (Number.isNaN(Date.parse(candidate.generatedAt))) return false;

    // Validate total (non-negative integer)
    if (typeof candidate.total !== 'number' || !Number.isInteger(candidate.total) || candidate.total < 0) {
        return false;
    }

    // Validate records (array)
    if (!Array.isArray(candidate.records)) return false;

    // Validate each record
    const validTypes: SearchRecordType[] = ['article', 'podcast', 'author', 'category'];
    for (const record of candidate.records) {
        if (!record || typeof record !== 'object') return false;
        const rec = record as Record<string, unknown>;

        if (typeof rec.id !== 'string' || !rec.id) return false;
        if (!validTypes.includes(rec.type as SearchRecordType)) return false;
        if (typeof rec.slug !== 'string' || !rec.slug) return false;
        if (typeof rec.title !== 'string' || !rec.title) return false;
        if (rec.description !== null && rec.description !== undefined && typeof rec.description !== 'string') {
            return false;
        }
        if (rec.content !== null && rec.content !== undefined && typeof rec.content !== 'string') {
            return false;
        }
        if (typeof rec.href !== 'string' || !rec.href) return false;
        if (rec.publishedAt !== null && rec.publishedAt !== undefined && typeof rec.publishedAt !== 'string') {
            return false;
        }
        if (!Array.isArray(rec.tags)) return false;
        if (!rec.tags.every((tag: unknown) => typeof tag === 'string')) return false;
        if (
            rec.coverImageUrl !== null &&
            rec.coverImageUrl !== undefined &&
            typeof rec.coverImageUrl !== 'string'
        ) {
            return false;
        }
    }

    return true;
}

/**
 * Loads and returns the search index file from the Strapi API.
 *
 * @returns The parsed search index content as a `SearchIndexFile`
 * @throws FetchError if the HTTP request returns a non-OK status
 * @throws ValidationError if the fetched payload is missing or does not match the expected structure
 */
async function loadSearchIndex(): Promise<SearchIndexFile> {
    const base = getStrapiApiBaseUrl();
    const url = new URL('/api/search-index', base);

    const res = await fetch(url, {
        headers: getAuthHeader(),
        next: {revalidate: 3600, tags: ['search-index']},
    });

    if (!res.ok) {
        throw new FetchError(`Failed to fetch search index: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    const content = unwrapSearchIndex(json);

    if (!content || typeof content !== 'object') {
        throw new ValidationError('Malformed search index: content is not an object');
    }

    if (!isValidSearchIndexFile(content)) {
        throw new ValidationError('Malformed search index: invalid structure');
    }

    return content;
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
            if (error instanceof FetchError) {
                console.error('[search-index] Failed to fetch search index:', error.message, error.stack);
                return NextResponse.json({error: 'Unable to fetch search index'}, {status: 502});
            }
            if (error instanceof ValidationError) {
                console.error('[search-index] Malformed search index:', error.message, error.stack);
                return NextResponse.json({error: 'Internal server error'}, {status: 500});
            }
            console.error('[search-index] Unexpected error while fetching search index:', error);
            return NextResponse.json({error: 'Internal server error'}, {status: 500});
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
        if (error instanceof FetchError) {
            console.error('[search-index] Failed to fetch search index during search:', error.message, error.stack);
            return NextResponse.json({error: 'Unable to fetch search index'}, {status: 502});
        }
        if (error instanceof ValidationError) {
            console.error('[search-index] Malformed search index during search:', error.message, error.stack);
            return NextResponse.json({error: 'Internal server error'}, {status: 500});
        }
        console.error('[search-index] Unexpected error during search:', error);
        return NextResponse.json({error: 'Internal server error'}, {status: 500});
    }
}