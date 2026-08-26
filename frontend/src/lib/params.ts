import {validateSlugSafe} from '@/src/lib/security/slugValidation';

/** Route params for `[slug]` segments (e.g. `/artikel/[slug]`). */
export type SlugParams = {
    slug: string;
};

/** Props shape shared by every `[slug]` page and route handler. */
export type SlugPageParams = {
    params: Promise<SlugParams>;
};

/** The `searchParams` record every page receives from Next.js. */
export type PageSearchParams = Record<string, string | string[] | undefined>;

/** The `searchParams` prop shape (a promise in the modern App Router). */
export type PageSearchParamsInput = PageSearchParams | Promise<PageSearchParams>;

type ParsePageParamOptions = {
    /** Upper bound for the returned page number (e.g. 50 on the home feed). */
    maxPage?: number;
};

export function parsePageParam(
    searchParams: PageSearchParams,
    options: ParsePageParamOptions = {},
): number {
    const raw = searchParams.page;
    const rawString = Array.isArray(raw) ? raw[0] : raw;
    const parsed = Number(rawString);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    const page = Math.max(1, Math.floor(parsed));
    return options.maxPage !== undefined ? Math.min(page, options.maxPage) : page;
}

export function parseCategoryParam(searchParams: PageSearchParams): string | null {
    const raw = searchParams.category;
    const rawString = Array.isArray(raw) ? raw[0] : raw;
    if (!rawString) return null;
    return validateSlugSafe(rawString);
}
