/**
 * Shared search-index schema contract between Strapi builder and Next.js consumer.
 */

export type SearchRecordType = 'article' | 'podcast' | 'author' | 'category' | 'page';

export type SearchRecord = {
    id: string;
    type: SearchRecordType;
    slug: string;
    title: string;
    description?: string | null;
    content?: string | null;
    href: string;
    publishedAt?: string | null;
    tags: string[];
    coverImageUrl?: string | null;
};

export type SearchIndexFile = {
    version: number;
    generatedAt: string;
    total: number;
    records: SearchRecord[];
};

export const SEARCH_RECORD_TYPES: readonly SearchRecordType[] = [
    'article',
    'podcast',
    'author',
    'category',
    'page',
];
