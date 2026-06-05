import {
    SEARCH_RECORD_TYPES,
    type SearchIndexFile,
    type SearchRecordType,
} from '@/src/lib/shared/search';

export function isValidSearchIndexFile(obj: unknown): obj is SearchIndexFile {
    if (!obj || typeof obj !== 'object') return false;

    const candidate = obj as Record<string, unknown>;

    if (typeof candidate.version !== 'number' || !Number.isFinite(candidate.version)) return false;

    if (typeof candidate.generatedAt !== 'string' || !candidate.generatedAt) return false;
    if (Number.isNaN(Date.parse(candidate.generatedAt))) return false;

    if (typeof candidate.total !== 'number' || !Number.isInteger(candidate.total) || candidate.total < 0) {
        return false;
    }

    if (!Array.isArray(candidate.records)) return false;

    for (const record of candidate.records) {
        if (!record || typeof record !== 'object') return false;
        const rec = record as Record<string, unknown>;

        if (typeof rec.id !== 'string' || !rec.id) return false;
        if (!SEARCH_RECORD_TYPES.includes(rec.type as SearchRecordType)) return false;
        if (typeof rec.slug !== 'string' || !rec.slug) return false;
        if (typeof rec.title !== 'string' || !rec.title) return false;
        if (rec.description !== null && rec.description !== undefined && typeof rec.description !== 'string') {
            return false;
        }
        if (rec.content !== null && rec.content !== undefined && typeof rec.content !== 'string') {
            return false;
        }
        if (typeof rec.href !== 'string' || !rec.href) return false;
        if (rec.publishedAt !== null && rec.publishedAt !== undefined && typeof rec.publishedAt !== 'string') {
            return false;
        }
        if (!Array.isArray(rec.tags)) return false;
        if (!rec.tags.every((tag: unknown) => typeof tag === 'string')) return false;
        if (rec.coverImageUrl !== null && rec.coverImageUrl !== undefined && typeof rec.coverImageUrl !== 'string') {
            return false;
        }
    }

    return true;
}
