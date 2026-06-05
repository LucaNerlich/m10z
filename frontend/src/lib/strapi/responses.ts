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
