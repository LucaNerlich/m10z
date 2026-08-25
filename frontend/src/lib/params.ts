import {validateSlugSafe} from '@/src/lib/security/slugValidation';

type ParsePageParamOptions = {
    /** Upper bound for the returned page number (e.g. 50 on the home feed). */
    maxPage?: number;
};

export function parsePageParam(
    searchParams: Record<string, string | string[] | undefined>,
    options: ParsePageParamOptions = {},
): number {
    const raw = searchParams.page;
    const rawString = Array.isArray(raw) ? raw[0] : raw;
    const parsed = Number(rawString);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    const page = Math.max(1, Math.floor(parsed));
    return options.maxPage !== undefined ? Math.min(page, options.maxPage) : page;
}

export function parseCategoryParam(searchParams: Record<string, string | string[] | undefined>): string | null {
    const raw = searchParams.category;
    const rawString = Array.isArray(raw) ? raw[0] : raw;
    if (!rawString) return null;
    return validateSlugSafe(rawString);
}
