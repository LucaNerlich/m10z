import {
    readCollection,
    readSingle,
    type ContentReadOptions,
} from '@/src/lib/strapi/contentAccess';

export type {
    StrapiCollectionResponse,
    StrapiMeta,
    StrapiSingleResponse,
    FetchStrapiOptions,
} from '@/src/lib/strapi/responses';

function toReadOptions(options: {tags?: string[]; revalidate?: number}): ContentReadOptions {
    return {tags: options.tags ?? [], revalidate: options.revalidate};
}

export async function fetchStrapiSingle<TData>(
    endpoint: string,
    query: string = '',
    options: {tags?: string[]; revalidate?: number} = {},
): Promise<import('@/src/lib/strapi/responses').StrapiSingleResponse<TData>> {
    return readSingle<TData>(endpoint, query, toReadOptions(options));
}

export async function fetchStrapiCollection<TData>(
    endpoint: string,
    query: string = '',
    options: {tags?: string[]; revalidate?: number} = {},
): Promise<import('@/src/lib/strapi/responses').StrapiCollectionResponse<TData>> {
    return readCollection<TData>(endpoint, query, toReadOptions(options));
}
