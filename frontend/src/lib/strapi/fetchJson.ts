import {strapiFetch} from '@/src/lib/strapiTransport';

export type ContentFetchOptions = {
    tags: string[];
    revalidate?: number;
    timeout?: number;
    context?: {
        slug?: string;
        contentType?: string;
        populateOptions?: unknown;
    };
};

export async function fetchJson<T>(pathWithQuery: string, options: ContentFetchOptions): Promise<T> {
    return strapiFetch<T>({
        path: pathWithQuery,
        cache: {mode: 'tags', tags: options.tags, revalidate: options.revalidate},
        timeoutMs: options.timeout,
        diagnosticName: 'strapi.fetchJson',
        context: options.context,
    });
}

export async function fetchJsonNoStore<T>(pathWithQuery: string, options: ContentFetchOptions): Promise<T> {
    return strapiFetch<T>({
        path: pathWithQuery,
        cache: {mode: 'no-store'},
        timeoutMs: options.timeout,
        diagnosticName: 'strapi.fetchJsonNoStore',
        context: options.context,
    });
}
