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
    coverImageUrl?: string | null;
};

export type SearchIndexFile = {
    version: 1 | 2;
    generatedAt: string;
    total: number;
    records: SearchRecord[];
};


