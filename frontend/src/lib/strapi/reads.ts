import {strapiFetch} from '@/src/lib/strapiTransport';

export type StrapiMeta = {
    [key: string]: unknown;
};

export type StrapiSingleResponse<TData> = {
    data: TData;
    meta: StrapiMeta;
};

export type StrapiCollectionResponse<TData> = {
    data: TData[];
    meta: {
        pagination?: {
            page: number;
            pageSize: number;
            pageCount: number;
            total: number;
        };
        [key: string]: unknown;
    };
};

export type FetchStrapiOptions = {
    tags?: string[];
    revalidate?: number;
};

function buildApiPath(endpoint: string, query: string): string {
    const normalized = endpoint.replace(/^\/*/, '');
    const q = query.startsWith('?') || query.length === 0 ? query : `?${query}`;
    return `/api/${normalized}${q}`;
}

function fetchStrapiResource<T>(endpoint: string, query: string, options: FetchStrapiOptions): Promise<T> {
    return strapiFetch<T>({
        path: buildApiPath(endpoint, query),
        cache: {mode: 'tags', tags: options.tags ?? [], revalidate: options.revalidate},
        diagnosticName: 'strapi.read',
    });
}

export async function fetchStrapiSingle<TData>(
    endpoint: string,
    query: string = '',
    options: FetchStrapiOptions = {},
): Promise<StrapiSingleResponse<TData>> {
    return fetchStrapiResource<StrapiSingleResponse<TData>>(endpoint, query, options);
}

export async function fetchStrapiCollection<TData>(
    endpoint: string,
    query: string = '',
    options: FetchStrapiOptions = {},
): Promise<StrapiCollectionResponse<TData>> {
    return fetchStrapiResource<StrapiCollectionResponse<TData>>(endpoint, query, options);
}
