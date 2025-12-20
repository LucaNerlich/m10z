import prettify from 'prettify-xml';

export type FeedBuildResult = {
  xml: string;
  etag?: string; // should include quotes if provided, e.g. "\"abc\""
  lastModified?: Date | null;
};

export type StrapiFetchArgs = {
  strapiBaseUrl: string;
  apiPathWithQuery: string;
  token?: string | undefined;
  revalidateSeconds: number;
  tags: string[];
};

export async function fetchStrapiJson<T>({
  strapiBaseUrl,
  apiPathWithQuery,
  token,
  revalidateSeconds,
  tags,
}: StrapiFetchArgs): Promise<T> {
  const url = new URL(apiPathWithQuery, strapiBaseUrl);

  const headers = new Headers();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(url, {
    headers,
    next: {
      revalidate: revalidateSeconds,
      tags,
    },
  });

  if (!res.ok) {
    throw new Error(`Strapi request failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

export function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

export function formatXml(xml: string, indent: number): string {
  return prettify(xml, { indent, newline: '\n' });
}

export function buildRssHeaders(args: {
  etag?: string;
  lastModified?: Date | null;
  cacheControl?: string;
}): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'application/rss+xml; charset=utf-8');
  headers.set('Cache-Control', args.cacheControl ?? 'public, max-age=3600, must-revalidate');
  if (args.etag) headers.set('ETag', args.etag);
  if (args.lastModified) headers.set('Last-Modified', args.lastModified.toUTCString());
  return headers;
}

export function maybeReturn304(request: Request, etag?: string, headers?: Headers): Response | null {
  if (!etag || !headers) return null;
  const inm = request.headers.get('if-none-match');
  if (inm && inm === etag) return new Response(null, { status: 304, headers });
  return null;
}

export function fallbackFeedXml(args: {
  title: string;
  link: string;
  selfLink: string;
  description: string;
}): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
    `  <channel>\n` +
    `    <title>${args.title}</title>\n` +
    `    <link>${args.link}</link>\n` +
    `    <description>${args.description}</description>\n` +
    `    <atom:link href="${args.selfLink}" rel="self" type="application/rss+xml"/>\n` +
    `  </channel>\n` +
    `</rss>\n`
  );
}


