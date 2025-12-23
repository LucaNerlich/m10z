export interface StrapiMeta {
  // Strapi often returns an empty object here; keep it extensible.
  [key: string]: unknown;
}

export interface StrapiSingleResponse<TData> {
  data: TData;
  meta: StrapiMeta;
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

function getStrapiApiBaseUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_STRAPI_URL;
  if (!raw) {
    throw new Error(
      'Missing STRAPI_API_URL. Set it in .env.local (e.g. STRAPI_API_URL=http://localhost:1337).'
    );
  }

  try {
    return new URL(raw);
  } catch {
    throw new Error(
      `Invalid STRAPI_API_URL: "${raw}". Expected a valid absolute URL like "http://localhost:1337".`
    );
  }
}

async function fetchStrapiJson<T>(
  apiPath: string,
  options: FetchStrapiOptions = {}
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
  options: FetchStrapiOptions = {}
): Promise<StrapiSingleResponse<TData>> {
  // endpoint examples: "imprint", "privacy"
  const normalized = endpoint.replace(/^\/*/, '');
  return await fetchStrapiJson<StrapiSingleResponse<TData>>(
    `/api/${normalized}`,
    options
  );
}

export async function getImprint(options: FetchStrapiOptions = {}) {
  const res = await fetchStrapiSingle<StrapiLegalDoc>('imprint', options);
  assertIsLegalDoc(res.data);
  return res.data;
}

export async function getPrivacy(options: FetchStrapiOptions = {}) {
  const res = await fetchStrapiSingle<StrapiLegalDoc>('privacy', options);
  assertIsLegalDoc(res.data);
  return res.data;
}


