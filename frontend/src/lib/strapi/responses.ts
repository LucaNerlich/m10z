/** Normalized Strapi pagination meta, shared by every list surface in the app. */
export type PaginationMeta = {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
};

/**
 * Raw Strapi response meta. Only `pagination` is consumed by the app (and
 * normalized via `normalizePagination`); it is optional because single-type
 * responses carry no pagination.
 */
export type StrapiMeta = {
    pagination?: Partial<PaginationMeta>;
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
    meta: StrapiMeta;
};

export type FetchStrapiOptions = {
    tags?: string[];
    revalidate?: number;
};
