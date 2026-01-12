import {validateSlugSafe} from '@/src/lib/security/slugValidation';

export function parsePageParam(searchParams: Record<string, string | string[] | undefined>): number {
    const raw = searchParams.page;
    const rawString = Array.isArray(raw) ? raw[0] : raw;
    const parsed = Number(rawString);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.max(1, Math.floor(parsed));
}

export function parseCategoryParam(searchParams: Record<string, string | string[] | undefined>): string | null {
    const raw = searchParams.category;
    const rawString = Array.isArray(raw) ? raw[0] : raw;
    if (!rawString) return null;
    return validateSlugSafe(rawString);
}


