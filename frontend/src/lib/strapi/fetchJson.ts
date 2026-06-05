import {readApiPath, type ContentReadOptions} from '@/src/lib/strapi/contentAccess';

export type ContentFetchOptions = {
    tags: string[];
    revalidate?: number;
    timeout?: number;
    context?: ContentReadOptions['context'];
};

function toReadOptions(options: ContentFetchOptions, cache: 'tags' | 'no-store'): ContentReadOptions {
    return {
        tags: options.tags,
        revalidate: options.revalidate,
        timeoutMs: options.timeout,
        cache,
        context: options.context,
    };
}

export async function fetchJson<T>(pathWithQuery: string, options: ContentFetchOptions): Promise<T> {
    return readApiPath<T>(pathWithQuery, {
        ...toReadOptions(options, 'tags'),
        diagnosticName: 'strapi.fetchJson',
    });
}

export async function fetchJsonNoStore<T>(pathWithQuery: string, options: ContentFetchOptions): Promise<T> {
    return readApiPath<T>(pathWithQuery, {
        ...toReadOptions(options, 'no-store'),
        diagnosticName: 'strapi.fetchJsonNoStore',
    });
}
