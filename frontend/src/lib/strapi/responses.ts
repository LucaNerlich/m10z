type StrapiMeta = {
    [key: string]: unknown;
};

/** Normalized Strapi pagination meta, shared by every list surface in the app. */
export type PaginationMeta = {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
};

/** Normalized paginated result returned by list fetchers (items + meta + cursor hint). */
export type PaginatedResult<T> = {
    items: T[];
    pagination: PaginationMeta;
    hasNextPage: boolean;
};

export type StrapiSingleResponse<TData> = {
    data: TData;
    meta: StrapiMeta;
};

export type StrapiCollectionResponse<TData> = {
    data: TData[];
    meta: {
        pagination?: PaginationMeta;
        [key: string]: unknown;
    };
};

export type FetchStrapiOptions = {
    tags?: string[];
    revalidate?: number;
};
