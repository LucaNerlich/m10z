import {CACHE_REVALIDATE_DEFAULT} from '@/src/lib/cache/constants';
import {strapiFetch} from '@/src/lib/strapiTransport';

import type {StrapiCollectionResponse, StrapiSingleResponse} from '@/src/lib/strapi/responses';

export type {
    FetchStrapiOptions,
    StrapiCollectionResponse,
    StrapiMeta,
    StrapiSingleResponse,
} from '@/src/lib/strapi/responses';

export type ContentReadOptions = {
    tags: string[];
    revalidate?: number;
    timeoutMs?: number;
    auth?: 'public' | 'privileged';
    cache?: 'tags' | 'no-store';
    context?: {
        slug?: string;
        contentType?: string;
        populateOptions?: unknown;
    };
    diagnosticName?: string;
};

const DEFAULT_FEED_TIMEOUT_MS = 30_000;

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

function resolveCacheDirective(options: ContentReadOptions): {
    mode: 'tags' | 'no-store';
    tags: string[];
    revalidate?: number;
} {
    if (options.cache === 'no-store') {
        return {mode: 'no-store', tags: options.tags};
    }
    return {
        mode: 'tags',
        tags: options.tags,
        revalidate: options.revalidate,
    };
}

/**
 * Single read interface for Content access: normalises endpoint vs /api path shape,
 * attaches cache tags, and routes privileged reads through the transport seam.
 */
export async function readStrapi<T>(endpointOrPath: string, query: string, options: ContentReadOptions): Promise<T> {
    const path = buildApiPath(endpointOrPath, query);
    const cache = resolveCacheDirective(options);
    return strapiFetch<T>({
        path,
        auth: options.auth ?? 'public',
        cache,
        timeoutMs: options.timeoutMs,
        diagnosticName: options.diagnosticName ?? 'strapi.read',
        context: options.context,
    });
}

export async function readCollection<TData>(
    endpoint: string,
    query: string = '',
    options: ContentReadOptions,
): Promise<StrapiCollectionResponse<TData>> {
    return readStrapi<StrapiCollectionResponse<TData>>(endpoint, query, {
        ...options,
        diagnosticName: options.diagnosticName ?? 'strapi.readCollection',
    });
}

export async function readSingle<TData>(
    endpoint: string,
    query: string = '',
    options: ContentReadOptions,
): Promise<StrapiSingleResponse<TData>> {
    return readStrapi<StrapiSingleResponse<TData>>(endpoint, query, {
        ...options,
        diagnosticName: options.diagnosticName ?? 'strapi.readSingle',
    });
}

export async function readApiPath<T>(pathWithQuery: string, options: ContentReadOptions): Promise<T> {
    const path = pathWithQuery.startsWith('/api/') ? pathWithQuery : `/api/${pathWithQuery.replace(/^\/*/, '')}`;
    return readStrapi<T>(path, '', {...options, diagnosticName: options.diagnosticName ?? 'strapi.readApiPath'});
}

export type ContentFetchOptions = {
    tags: string[];
    revalidate?: number;
    timeout?: number;
    context?: ContentReadOptions['context'];
};

function toTaggedReadOptions(options: ContentFetchOptions, cache: 'tags' | 'no-store'): ContentReadOptions {
    return {
        tags: options.tags,
        revalidate: options.revalidate,
        timeoutMs: options.timeout,
        cache,
        context: options.context,
    };
}

/** Read a Strapi API path with tag-based caching (domain fetchers). */
export async function fetchJson<T>(pathWithQuery: string, options: ContentFetchOptions): Promise<T> {
    return readApiPath<T>(pathWithQuery, {
        ...toTaggedReadOptions(options, 'tags'),
        diagnosticName: 'strapi.fetchJson',
    });
}

/** Read a Strapi API path without caching (preview routes). */
export async function fetchJsonNoStore<T>(pathWithQuery: string, options: ContentFetchOptions): Promise<T> {
    return readApiPath<T>(pathWithQuery, {
        ...toTaggedReadOptions(options, 'no-store'),
        diagnosticName: 'strapi.fetchJsonNoStore',
    });
}

export async function fetchStrapiSingle<TData>(
    endpoint: string,
    query: string = '',
    options: {tags?: string[]; revalidate?: number} = {},
): Promise<StrapiSingleResponse<TData>> {
    return readSingle<TData>(endpoint, query, {
        tags: options.tags ?? [],
        revalidate: options.revalidate,
        diagnosticName: 'strapi.fetchStrapiSingle',
    });
}

export async function fetchStrapiCollection<TData>(
    endpoint: string,
    query: string = '',
    options: {tags?: string[]; revalidate?: number} = {},
): Promise<StrapiCollectionResponse<TData>> {
    return readCollection<TData>(endpoint, query, {
        tags: options.tags ?? [],
        revalidate: options.revalidate,
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
            timeoutMs: DEFAULT_FEED_TIMEOUT_MS,
            diagnosticName: 'strapi.feed',
        });
    };
}
