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
        const res = await fetchStrapiSingle<StrapiLegalDoc>(kind, options);
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

export async function getPrivacy(options: FetchStrapiOptions = {}) {
    return getLegalDocWithFallback('privacy', options);
}

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

export async function getAbout(options: FetchStrapiOptions = {}) {
    return getAboutWithFallback(options);
}


