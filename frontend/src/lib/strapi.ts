import qs from 'qs';

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

export interface FetchStrapiOptions {
    /**
     * ISR revalidate seconds. Example: 3600 for 1 hour.
     */
    revalidateSeconds?: number;
    /**
     * Optional cache tags for later invalidation via revalidateTag().
     */
    tags?: string[];
}

export function getStrapiApiBaseUrl(): URL {
    // Prefer server-only env var; fall back to NEXT_PUBLIC_* for local/dev convenience.
    const raw = process.env.NEXT_PUBLIC_STRAPI_URL;
    if (!raw) {
        throw new Error(
            'Missing NEXT_PUBLIC_STRAPI_URL. Set it (e.g. NEXT_PUBLIC_STRAPI_URL=http://localhost:1337).',
        );
    }

    try {
        return new URL(raw);
    } catch {
        throw new Error(
            `Invalid NEXT_PUBLIC_STRAPI_URL: "${raw}". Expected a valid absolute URL like "http://localhost:1337".`,
        );
    }
}

async function fetchStrapiJson<T>(
    apiPath: string,
    options: FetchStrapiOptions = {},
): Promise<T> {
    const base = getStrapiApiBaseUrl();
    const url = new URL(apiPath, base);
    const res = await fetch(url, {
        next: {
            revalidate: options.revalidateSeconds,
            tags: options.tags,
        },
    });

    if (!res.ok) {
        // Fail securely: do not include response body (may leak details).
        throw new Error(`Strapi request failed: ${res.status} ${res.statusText}`);
    }

    return (await res.json()) as T;
}

export function toAbsoluteUrl(maybeAbsoluteOrRelativeUrl: string): string {
    if (/^https?:\/\//i.test(maybeAbsoluteOrRelativeUrl)) return maybeAbsoluteOrRelativeUrl;
    const base = getStrapiApiBaseUrl().toString().replace(/\/+$/, '');
    const path = maybeAbsoluteOrRelativeUrl.startsWith('/')
        ? maybeAbsoluteOrRelativeUrl
        : `/${maybeAbsoluteOrRelativeUrl}`;
    return `${base}${path}`;
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
 * @param options - Fetch options such as cache revalidation seconds and cache tags
 * @returns The Strapi single response object containing the resource in `data` and request metadata in `meta`
 */
export async function fetchStrapiSingle<TData>(
    endpoint: string,
    query: string = '',
    options: FetchStrapiOptions = {},
): Promise<StrapiSingleResponse<TData>> {
    // endpoint examples: "imprint", "privacy", "about"
    const normalized = endpoint.replace(/^\/*/, '');
    const q = query.startsWith('?') || query.length === 0 ? query : `?${query}`;
    return await fetchStrapiJson<StrapiSingleResponse<TData>>(
        `/api/${normalized}${q}`,
        options,
    );
}

export async function fetchStrapiCollection<TData>(
    endpoint: string,
    query: string = '',
    options: FetchStrapiOptions = {},
): Promise<StrapiCollectionResponse<TData>> {
    const normalized = endpoint.replace(/^\/*/, '');
    const q = query.startsWith('?') || query.length === 0 ? query : `?${query}`;
    return await fetchStrapiJson<StrapiCollectionResponse<TData>>(`/api/${normalized}${q}`, options);
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
        content: 'Dieser Inhalt ist derzeit nicht verfügbar.',
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

export async function getImprint(options: FetchStrapiOptions = {}) {
    return getLegalDocWithFallback('imprint', options);
}

/**
 * Retrieve the site's privacy legal document, falling back to a built-in default if the remote fetch fails.
 *
 * @param options - Optional fetch options (e.g., `revalidateSeconds` for ISR and `tags` for cache tagging)
 * @returns The privacy `StrapiLegalDoc` retrieved from Strapi, or a fallback `StrapiLegalDoc` if fetching or validation fails
 */
export async function getPrivacy(options: FetchStrapiOptions = {}) {
    return getLegalDocWithFallback('privacy', options);
}

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
        content: 'Dieser Inhalt ist derzeit nicht verfügbar.',
        logo: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        publishedAt: null,
    };

    try {
        const query = qs.stringify({populate: 'logo'}, {encodeValuesOnly: true});
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
export async function getAbout(options: FetchStrapiOptions = {}) {
    return getAboutWithFallback(options);
}

