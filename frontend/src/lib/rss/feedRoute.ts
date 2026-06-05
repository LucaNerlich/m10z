import {escapeXml} from '@/src/lib/rss/xml';

// Trim trailing slashes from a base URL. The canonical site-origin normaliser used by
// the shared feed definition (feedDefinition.FEED_SITE_URL).
export function normalizeBaseUrl(raw: string): string {
    return raw.replace(/\/+$/, '');
}

export function buildRssHeaders(args: {
    etag?: string;
    contentDisposition?: 'inline' | 'attachment',
    lastModified?: Date | null;
    cacheControl?: string;
}): Headers {
    const headers = new Headers();
    headers.set('Content-Type', 'application/xml; charset=utf-8');
    headers.set('Cache-Control', args.cacheControl ?? 'public, max-age=3600, must-revalidate');
    headers.set('Content-Disposition', args.contentDisposition ?? 'inline');
    if (args.etag) headers.set('ETag', args.etag);
    if (args.lastModified) headers.set('Last-Modified', args.lastModified.toUTCString());
    return headers;
}

export function maybeReturn304(request: Request, etag?: string, headers?: Headers): Response | null {
    if (!etag || !headers) return null;
    const inm = request.headers.get('if-none-match');
    if (!inm) return null;
    // Per RFC 7232, If-None-Match can contain comma-separated ETags.
    const matches = inm.split(',').some((t) => t.trim() === etag);
    if (matches) return new Response(null, {status: 304, headers});
    return null;
}

export function fallbackFeedXml(args: {
    title: string;
    link: string;
    selfLink: string;
    description: string;
}): string {
    return (
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">` +
        `  <channel>` +
        `    <title>${escapeXml(args.title)}</title>` +
        `    <link>${escapeXml(args.link)}</link>` +
        `    <description>${escapeXml(args.description)}</description>` +
        `    <atom:link href="${escapeXml(args.selfLink)}" rel="self" type="application/rss+xml"/>` +
        `  </channel>` +
        `</rss>`
    );
}


