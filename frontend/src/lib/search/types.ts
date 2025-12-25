import {type StrapiMediaRef} from '@/src/lib/rss/media';

export type SearchRecordType = 'article' | 'podcast' | 'author' | 'category';

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
    coverImage?: StrapiMediaRef | null;
};

export type SearchIndexFile = {
    version: number;
    generatedAt: string;
    total: number;
    records: SearchRecord[];
};


