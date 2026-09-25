import {parse, stringify} from 'yaml';

import {getEffectiveDate, toDateTimestamp} from '@/src/lib/effectiveDate';

import {
    STATISTIK_SNAPSHOT_VERSION,
    type StatistikArticle,
    type StatistikCategory,
    type StatistikPerson,
    type StatistikPodcast,
    type StatistikSnapshot,
} from '@/src/lib/statistik/types';

// ---- Raw Strapi documents (as returned by the Strapi MCP `list_*` tools) ----

type RawRelation = {documentId?: string | null};

export type RawStrapiNamedDoc = {
    documentId: string;
    slug?: string | null;
    title?: string | null;
};

export type RawStrapiContentDoc = RawStrapiNamedDoc & {
    date?: string | null;
    publishedAt?: string | null;
    wordCount?: number | null;
    duration?: number | null;
    authors?: RawRelation[] | null;
    categories?: RawRelation[] | null;
};

export type RawStatistikSource = {
    generatedAt: string;
    articles: RawStrapiContentDoc[];
    podcasts: RawStrapiContentDoc[];
    authors: RawStrapiNamedDoc[];
    categories: RawStrapiNamedDoc[];
};

function cleanText(value: string | null | undefined): string {
    return typeof value === 'string' ? value.trim() : '';
}

function toPositiveIntOrNull(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function buildSlugLookup(docs: RawStrapiNamedDoc[]): Map<string, StatistikPerson> {
    const lookup = new Map<string, StatistikPerson>();
    for (const doc of docs) {
        const slug = cleanText(doc.slug);
        if (!slug) continue;
        lookup.set(doc.documentId, {slug, name: cleanText(doc.title) || slug});
    }
    return lookup;
}

function resolveRelations(relations: RawRelation[] | null | undefined, lookup: Map<string, StatistikPerson>): string[] {
    if (!Array.isArray(relations)) return [];
    const slugs = relations
        .map((relation) => (relation.documentId ? lookup.get(relation.documentId)?.slug : undefined))
        .filter((slug): slug is string => typeof slug === 'string');
    return Array.from(new Set(slugs)).sort();
}

function byDateThenSlug<T extends {date: string; slug: string}>(a: T, b: T): number {
    return a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug);
}

function byName<T extends {name: string; slug: string}>(a: T, b: T): number {
    return a.name.localeCompare(b.name, 'de') || a.slug.localeCompare(b.slug);
}

type BaseEntry = Omit<StatistikArticle, 'wordCount'>;

function toBaseEntry(
    doc: RawStrapiContentDoc,
    authors: Map<string, StatistikPerson>,
    categories: Map<string, StatistikPerson>,
): BaseEntry | null {
    const slug = cleanText(doc.slug);
    const rawDate = getEffectiveDate(doc);
    const timestamp = toDateTimestamp(rawDate);
    if (!slug || timestamp === null) return null;
    return {
        slug,
        title: cleanText(doc.title) || slug,
        date: new Date(timestamp).toISOString(),
        authors: resolveRelations(doc.authors, authors),
        categories: resolveRelations(doc.categories, categories),
    };
}

/**
 * Pure: raw Strapi documents → the flat, deterministic snapshot. Entries without a
 * slug or a valid date are dropped; relations pointing at unknown (e.g. unpublished)
 * authors or categories are dropped too. Output is sorted for stable diffs.
 */
export function buildStatistikSnapshot(source: RawStatistikSource): StatistikSnapshot {
    const authorLookup = buildSlugLookup(source.authors);
    const categoryLookup = buildSlugLookup(source.categories);

    const articles: StatistikArticle[] = source.articles
        .map((doc) => {
            const base = toBaseEntry(doc, authorLookup, categoryLookup);
            return base ? {...base, wordCount: toPositiveIntOrNull(doc.wordCount)} : null;
        })
        .filter((entry): entry is StatistikArticle => entry !== null)
        .sort(byDateThenSlug);

    const podcasts: StatistikPodcast[] = source.podcasts
        .map((doc) => {
            const base = toBaseEntry(doc, authorLookup, categoryLookup);
            return base ? {...base, duration: toPositiveIntOrNull(doc.duration)} : null;
        })
        .filter((entry): entry is StatistikPodcast => entry !== null)
        .sort(byDateThenSlug);

    return {
        version: STATISTIK_SNAPSHOT_VERSION,
        generatedAt: source.generatedAt,
        authors: Array.from(authorLookup.values()).sort(byName),
        categories: Array.from(categoryLookup.values()).sort(byName),
        articles,
        podcasts,
    };
}

const SNAPSHOT_HEADER = [
    '# M10Z Statistik-Snapshot — generiert von `pnpm run snapshot:statistik` (siehe .github/agents/statistik.agent.md).',
    '# Nicht von Hand bearbeiten.',
    '',
].join('\n');

export function serializeStatistikSnapshot(snapshot: StatistikSnapshot): string {
    return SNAPSHOT_HEADER + stringify(snapshot, {lineWidth: 0});
}

// ---- Parsing / validation ----------------------------------------------------

function fail(path: string, expected: string): never {
    throw new Error(`Invalid statistik snapshot: ${path} must be ${expected}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string, path: string): string {
    const value = record[key];
    if (typeof value !== 'string' || value.trim().length === 0) fail(`${path}.${key}`, 'a non-empty string');
    return value;
}

function readDate(record: Record<string, unknown>, key: string, path: string): string {
    const value = readString(record, key, path);
    if (toDateTimestamp(value) === null) fail(`${path}.${key}`, 'an ISO date');
    return value;
}

function readNullableNumber(record: Record<string, unknown>, key: string, path: string): number | null {
    const value = record[key];
    if (value === null || value === undefined) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail(`${path}.${key}`, 'a number or null');
    return value;
}

function readStringArray(record: Record<string, unknown>, key: string, path: string): string[] {
    const value = record[key];
    if (value === null || value === undefined) return [];
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
        fail(`${path}.${key}`, 'a list of strings');
    }
    return value;
}

function readList<T>(record: Record<string, unknown>, key: string, map: (item: Record<string, unknown>, path: string) => T): T[] {
    const value = record[key];
    if (!Array.isArray(value)) fail(key, 'a list');
    return value.map((item, index) => {
        const path = `${key}[${index}]`;
        if (!isRecord(item)) fail(path, 'an object');
        return map(item, path);
    });
}

function readNamed(item: Record<string, unknown>, path: string): StatistikCategory {
    return {slug: readString(item, 'slug', path), name: readString(item, 'name', path)};
}

/** Parse + validate the YAML snapshot. Throws a descriptive error when the file is malformed. */
export function parseStatistikSnapshot(raw: string): StatistikSnapshot {
    const data: unknown = parse(raw);
    if (!isRecord(data)) fail('snapshot', 'an object');
    if (data.version !== STATISTIK_SNAPSHOT_VERSION) fail('version', String(STATISTIK_SNAPSHOT_VERSION));

    return {
        version: STATISTIK_SNAPSHOT_VERSION,
        generatedAt: readDate(data, 'generatedAt', 'snapshot'),
        authors: readList(data, 'authors', readNamed),
        categories: readList(data, 'categories', readNamed),
        articles: readList(data, 'articles', (item, path) => ({
            slug: readString(item, 'slug', path),
            title: readString(item, 'title', path),
            date: readDate(item, 'date', path),
            wordCount: readNullableNumber(item, 'wordCount', path),
            authors: readStringArray(item, 'authors', path),
            categories: readStringArray(item, 'categories', path),
        })),
        podcasts: readList(data, 'podcasts', (item, path) => ({
            slug: readString(item, 'slug', path),
            title: readString(item, 'title', path),
            date: readDate(item, 'date', path),
            duration: readNullableNumber(item, 'duration', path),
            authors: readStringArray(item, 'authors', path),
            categories: readStringArray(item, 'categories', path),
        })),
    };
}
