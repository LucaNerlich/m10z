import {CACHE_REVALIDATE_DEFAULT} from '@/src/lib/cache/constants';
import {type StrapiPopulate} from '@/src/lib/strapi-queries/populate';
import {strapiFetch} from '@/src/lib/strapiTransport';

import type {StrapiCollectionResponse, StrapiSingleResponse} from '@/src/lib/strapi/responses';

export type {StrapiCollectionResponse, StrapiSingleResponse} from '@/src/lib/strapi/responses';

/**
 * The one options shape for a Content access read.
 *
 * Everything else here used to carry its own near-identical shape (a `timeout` vs
 * `timeoutMs` field, an implied cache mode) plus an adapter to convert between them;
 * callers now pass this and the seam normalises the rest.
 */
export type ContentReadOptions = {
    tags?: string[];
    revalidate?: number;
    timeoutMs?: number;
    auth?: 'public' | 'privileged';
    cache?: 'tags' | 'no-store';
    context?: {
        slug?: string;
        contentType?: string;
        populateOptions?: StrapiPopulate;
    };
    diagnosticName?: string;
};

function buildApiPath(endpointOrPath: string, query: string): string {
    if (endpointOrPath.startsWith('/api/')) {
        if (endpointOrPath.includes('?') || query.length === 0) {
            return endpointOrPath;
        }
        const q = query.startsWith('?') ? query : `?${query}`;
        return `${endpointOrPath}${q}`;
    }
    const normalized = endpointOrPath.replace(/^\/*/, '');
    const q = query.startsWith('?') || query.length === 0 ? query : `?${query}`;
    return `/api/${normalized}${q}`;
}

/**
 * Single read interface for Content access: normalises endpoint vs /api path shape,
 * attaches cache tags, and routes privileged reads through the transport seam.
 *
 * The timeout is left to the transport's default - the feed reader used to repeat
 * the same 30s constant here, which could only drift from the transport's value.
 */
async function readStrapi<T>(endpointOrPath: string, query: string, options: ContentReadOptions): Promise<T> {
    const path = buildApiPath(endpointOrPath, query);
    const tags = options.tags ?? [];
    const cache =
        options.cache === 'no-store'
            ? {mode: 'no-store' as const, tags}
            : {mode: 'tags' as const, tags, revalidate: options.revalidate};

    return strapiFetch<T>({
        path,
        auth: options.auth ?? 'public',
        cache,
        timeoutMs: options.timeoutMs,
        diagnosticName: options.diagnosticName ?? 'strapi.read',
        context: options.context,
    });
}

export async function readApiPath<T>(pathWithQuery: string, options: ContentReadOptions): Promise<T> {
    const path = pathWithQuery.startsWith('/api/') ? pathWithQuery : `/api/${pathWithQuery.replace(/^\/*/, '')}`;
    return readStrapi<T>(path, '', {...options, diagnosticName: options.diagnosticName ?? 'strapi.readApiPath'});
}

/** Read a Strapi API path with tag-based caching (domain fetchers). */
export async function fetchJson<T>(pathWithQuery: string, options: ContentReadOptions): Promise<T> {
    return readApiPath<T>(pathWithQuery, {
        ...options,
        cache: 'tags',
        diagnosticName: 'strapi.fetchJson',
    });
}

/** Read a Strapi API path without caching (preview routes). */
export async function fetchJsonNoStore<T>(pathWithQuery: string, options: ContentReadOptions): Promise<T> {
    return readApiPath<T>(pathWithQuery, {
        ...options,
        cache: 'no-store',
        diagnosticName: 'strapi.fetchJsonNoStore',
    });
}

export async function fetchStrapiSingle<TData>(
    endpoint: string,
    query: string = '',
    options: ContentReadOptions = {},
): Promise<StrapiSingleResponse<TData>> {
    return readStrapi<StrapiSingleResponse<TData>>(endpoint, query, {
        ...options,
        diagnosticName: 'strapi.fetchStrapiSingle',
    });
}

export async function fetchStrapiCollection<TData>(
    endpoint: string,
    query: string = '',
    options: ContentReadOptions = {},
): Promise<StrapiCollectionResponse<TData>> {
    return readStrapi<StrapiCollectionResponse<TData>>(endpoint, query, {
        ...options,
        diagnosticName: 'strapi.fetchStrapiCollection',
    });
}

/** Privileged feed read with production revalidate defaults. */
export function createPrivilegedFeedReader(tags: string[]): <T>(pathWithQuery: string) => Promise<T> {
    return async <T>(pathWithQuery: string): Promise<T> => {
        const revalidate = process.env.NODE_ENV === 'production' ? CACHE_REVALIDATE_DEFAULT : 0;
        return readApiPath<T>(pathWithQuery, {
            tags,
            auth: 'privileged',
            cache: revalidate === 0 ? 'no-store' : 'tags',
            revalidate: revalidate === 0 ? undefined : revalidate,
            diagnosticName: 'strapi.feed',
        });
    };
}
