import qs from 'qs';
import {cache} from 'react';

import {CACHE_REVALIDATE_DEFAULT} from './cache/constants';
import {getStrapiApiBaseUrl, strapiFetch} from './strapiTransport';

export {getStrapiApiBaseUrl};

export interface StrapiMeta {
    // Strapi often returns an empty object here; keep it extensible.
    [key: string]: unknown;
}

export interface StrapiSingleResponse<TData> {
    data: TData;
    meta: StrapiMeta;
}

export interface StrapiCollectionResponse<TData> {
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
}

export interface StrapiLegalDoc {
    id: number;
    documentId: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
}

export interface StrapiAbout {
    id: number;
    documentId: string;
    name: string;
    alternateName: string | null;
    content: string;
    logo: import('./rss/media').StrapiMediaRef | null;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
}

export interface StrapiFeedsInfo {
    id: number;
    documentId: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
}

export interface FetchStrapiOptions {
    tags?: string[];
    revalidate?: number;
}

// Single-type and collection reads share one shape: normalise `endpoint` + `query`
// into a `/api/...` path and cross the transport seam as a public (unauthenticated)
// read. Kept as one helper rather than a separate pass-through wrapper.
function buildApiPath(endpoint: string, query: string): string {
    const normalized = endpoint.replace(/^\/*/, '');
    const q = query.startsWith('?') || query.length === 0 ? query : `?${query}`;
    return `/api/${normalized}${q}`;
}

function fetchStrapiResource<T>(endpoint: string, query: string, options: FetchStrapiOptions): Promise<T> {
    return strapiFetch<T>({
        path: buildApiPath(endpoint, query),
        cache: {mode: 'tags', tags: options.tags ?? [], revalidate: options.revalidate},
        diagnosticName: 'strapi.single',
    });
}

function assertIsLegalDoc(data: unknown): asserts data is StrapiLegalDoc {
    if (!data || typeof data !== 'object') throw new Error('Invalid Strapi data');
    const d = data as Partial<StrapiLegalDoc>;

    if (typeof d.title !== 'string' || d.title.length === 0) {
        throw new Error('Invalid Strapi legal doc: missing title');
    }
    if (typeof d.content !== 'string') {
        throw new Error('Invalid Strapi legal doc: missing content');
    }
}

/**
 * Fetches a single Strapi resource from the specified API endpoint.
 *
 * @param endpoint - The resource endpoint (for example: "imprint", "privacy", "about")
 * @param query - Optional query string to append to the request; may be empty or may start with `?` (the function accepts either form)
 * @param options - Fetch options including cache tags and revalidation period (revalidate in seconds)
 * @returns The Strapi single response object containing the resource in `data` and request metadata in `meta`
 */
export async function fetchStrapiSingle<TData>(
    endpoint: string,
    query: string = '',
    options: FetchStrapiOptions = {},
): Promise<StrapiSingleResponse<TData>> {
    // endpoint examples: "imprint", "privacy", "about"
    return fetchStrapiResource<StrapiSingleResponse<TData>>(endpoint, query, options);
}

export async function fetchStrapiCollection<TData>(
    endpoint: string,
    query: string = '',
    options: FetchStrapiOptions = {},
): Promise<StrapiCollectionResponse<TData>> {
    return fetchStrapiResource<StrapiCollectionResponse<TData>>(endpoint, query, options);
}

/**
 * Retrieve the legal document for the given kind, falling back to a local placeholder if the remote fetch fails.
 *
 * @param kind - The legal document to fetch: `'imprint'` or `'privacy'`
 * @param options - Optional fetch options (e.g., revalidateSeconds and cache tags)
 * @returns The requested `StrapiLegalDoc`, or a fallback `StrapiLegalDoc` with placeholder content when fetching or validation fails
 */
async function getLegalDocWithFallback(
    kind: 'imprint' | 'privacy',
    options: FetchStrapiOptions = {},
): Promise<StrapiLegalDoc> {
    const nowIso = new Date().toISOString();
    const fallback: StrapiLegalDoc = {
        id: -1,
        documentId: `fallback-${kind}`,
        title: kind === 'imprint' ? 'Impressum' : 'Datenschutz',
        content:
            kind === 'imprint'
                ? 'Das Impressum konnte leider nicht geladen werden. Bitte versuche es später erneut.'
                : 'Die Datenschutzerklärung konnte leider nicht geladen werden. Bitte versuche es später erneut.',
        createdAt: nowIso,
        updatedAt: nowIso,
        publishedAt: null,
    };

    try {
        const res = await fetchStrapiSingle<StrapiLegalDoc>(kind, '', options);
        assertIsLegalDoc(res.data);
        return res.data;
    } catch (err) {
        console.warn(`[legal-doc] Failed to fetch ${kind}: ${err instanceof Error ? err.message : 'unknown error'}`);
        return fallback;
    }
}

export const getImprint = cache(async (options: FetchStrapiOptions = {}) => {
    return getLegalDocWithFallback('imprint', {
        ...options,
        revalidate: options.revalidate ?? CACHE_REVALIDATE_DEFAULT,
    });
});

/**
 * Retrieve the site's privacy legal document, falling back to a built-in default if the remote fetch fails.
 *
 * @param options - Optional fetch options (e.g., `revalidateSeconds` for ISR and `tags` for cache tagging)
 * @returns The privacy `StrapiLegalDoc` retrieved from Strapi, or a fallback `StrapiLegalDoc` if fetching or validation fails
 */
export const getPrivacy = cache(async (options: FetchStrapiOptions = {}) => {
    return getLegalDocWithFallback('privacy', {
        ...options,
        revalidate: options.revalidate ?? CACHE_REVALIDATE_DEFAULT,
    });
});

/**
 * Asserts that a value conforms to the StrapiAbout structure.
 *
 * @param data - The value to validate.
 * @throws Error if `data` is not an object, if `name` is not a non-empty string, or if `content` is not a string.
 */
function assertIsAbout(data: unknown): asserts data is StrapiAbout {
    if (!data || typeof data !== 'object') throw new Error('Invalid Strapi data');
    const d = data as Partial<StrapiAbout>;

    if (typeof d.name !== 'string' || d.name.length === 0) {
        throw new Error('Invalid Strapi about: missing name');
    }
    if (typeof d.content !== 'string') {
        throw new Error('Invalid Strapi about: missing content');
    }
}

/**
 * Fetches the site's "about" content from Strapi and falls back to a local placeholder if fetching or validation fails.
 *
 * @param options - Optional fetch options (e.g., `revalidateSeconds`, `tags`) to control caching and ISR behavior.
 * @returns The fetched `StrapiAbout` data, or a predefined fallback `StrapiAbout` if retrieval or runtime validation fails.
 */
async function getAboutWithFallback(
    options: FetchStrapiOptions = {},
): Promise<StrapiAbout> {
    const nowIso = new Date().toISOString();
    const fallback: StrapiAbout = {
        id: -1,
        documentId: 'fallback-about',
        name: 'Über Uns',
        alternateName: null,
        content:
            'Diese Seite erklärt, wie du die Feeds von Mindestens 10 Zeichen nutzen kannst.\n\n'
            + '- Artikel-Feed: `/rss.xml`\n'
            + '- Podcast-Feed: `/audiofeed.xml`\n\n'
            + 'Du kannst diese URLs in deinem RSS-Reader oder Podcast-Client abonnieren.',
        logo: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        publishedAt: null,
    };

    try {
        const query = qs.stringify(
            {populate: {logo: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']}}},
            {encodeValuesOnly: true},
        );
        const res = await fetchStrapiSingle<StrapiAbout>('about', query, options);
        assertIsAbout(res.data);
        return res.data;
    } catch (err) {
        console.warn(`[about] Failed to fetch about: ${err instanceof Error ? err.message : 'unknown error'}`);
        return fallback;
    }
}

/**
 * Loads the site's About content from Strapi, falling back to a safe default if the fetch fails.
 *
 * @param options - Optional fetch options (e.g., cache revalidation seconds and cache tags)
 * @returns The site's About content as a `StrapiAbout` object; a fallback `StrapiAbout` if the remote fetch fails
 */
export const getAbout = cache(async (options: FetchStrapiOptions = {}) => {
    return getAboutWithFallback({
        ...options,
        revalidate: options.revalidate ?? CACHE_REVALIDATE_DEFAULT,
    });
});

/**
 * Asserts that a value conforms to the StrapiFeedsInfo structure.
 *
 * @param data - The value to validate.
 * @throws Error if `data` is not an object, if `title` is not a non-empty string, or if `content` is not a string.
 */
function assertIsFeeds(data: unknown): asserts data is StrapiFeedsInfo {
    if (!data || typeof data !== 'object') throw new Error('Invalid Strapi data');
    const d = data as Partial<StrapiFeedsInfo>;

    if (typeof d.title !== 'string' || d.title.length === 0) {
        throw new Error('Invalid Strapi feeds: missing title');
    }
}

/**
 * Fetches the site's feeds explainer content from Strapi and falls back to a local placeholder if fetching or validation fails.
 *
 * @param options - Optional fetch options (e.g., `revalidateSeconds`, `tags`) to control caching and ISR behavior.
 * @returns The fetched `StrapiFeedsInfo` data, or a predefined fallback `StrapiFeedsInfo` if retrieval or runtime validation fails.
 */
async function getFeedsInfoWithFallback(
    options: FetchStrapiOptions = {},
): Promise<StrapiFeedsInfo> {
    const feed = `${process.env.NEXT_PUBLIC_DOMAIN}/rss.xml`
    const audioFeed = `${process.env.NEXT_PUBLIC_DOMAIN}/audiofeed.xml`
    const nowIso = new Date().toISOString();
    const fallback: StrapiFeedsInfo = {
        id: -1,
        documentId: 'fallback-feeds',
        title: 'RSS-Feeds',
        content:
            'Diese Seite erklärt, wie du die Feeds von Mindestens 10 Zeichen nutzen kannst.\n\n'
            + `- Artikel-Feed: \`${feed}\`\n`
            + `- Podcast-Feed: \`${audioFeed}\`\n\n`
            + 'Du kannst diese URLs in deinem RSS-Reader oder Podcast-Client abonnieren.',
        createdAt: nowIso,
        updatedAt: nowIso,
        publishedAt: null,
    };

    try {
        const res = await fetchStrapiSingle<StrapiFeedsInfo>('about-feed', '', options);
        assertIsFeeds(res.data);
        return {
            ...res.data,
            // about-feed.content is optional in Strapi; normalize for safe rendering.
            content: typeof (res.data as any).content === 'string' ? (res.data as any).content : '',
        };
    } catch (err) {
        console.warn(`[feeds] Failed to fetch feeds: ${err instanceof Error ? err.message : 'unknown error'}`);
        return fallback;
    }
}

/**
 * Loads the site's feeds explainer content from Strapi, falling back to a safe default if the fetch fails.
 *
 * @param options - Optional fetch options (e.g., cache revalidation seconds and cache tags)
 * @returns The site's feeds tutorial content as a `StrapiFeedsInfo` object; a fallback `StrapiFeedsInfo` if the remote fetch fails
 */
export const getFeedsInfo = cache(async (options: FetchStrapiOptions = {}) => {
    return getFeedsInfoWithFallback({
        ...options,
        revalidate: options.revalidate ?? CACHE_REVALIDATE_DEFAULT,
    });
});

