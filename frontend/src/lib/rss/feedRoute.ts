// @ts-ignore
import xmlFormat from 'xml-formatter';

import {escapeXml} from '@/src/lib/rss/xml';

export type FeedBuildResult = {
    xml: string;
    etag?: string; // should include quotes if provided, e.g. "\"abc\""
    lastModified?: Date | null;
};

export type StrapiFetchArgs = {
    strapiBaseUrl: string;
    apiPathWithQuery: string;
    token?: string | undefined;
    tags: string[];
    revalidate?: number;
    timeoutMs?: number;
};

export async function fetchStrapiJson<T>({
                                             strapiBaseUrl,
                                             apiPathWithQuery,
                                             token,
                                             tags,
                                             revalidate,
                                             timeoutMs,
                                         }: StrapiFetchArgs): Promise<T> {
    const url = new URL(apiPathWithQuery, strapiBaseUrl);

    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const controller = new AbortController();
    const timeout = timeoutMs ?? 30_000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, {
            headers,
            signal: controller.signal,
            // Next.js treats `revalidate: 0` as "revalidate immediately" (not "no cache"),
        // so we must use `cache: 'no-store'` to fully bypass the fetch cache in dev mode.
        ...(revalidate === 0
                ? {
                    cache: 'no-store',
                    next: {tags},
                }
                : {
                    next: {
                        tags,
                        revalidate,
                    },
                }),
        });

        if (!res.ok) {
            throw new Error(`Strapi request failed: ${res.status} ${res.statusText}`);
        }

        return (await res.json()) as T;
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            throw new Error(`Strapi request timed out after ${timeout}ms: ${url.toString()}`);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

export function normalizeBaseUrl(raw: string): string {
    return raw.replace(/\/+$/, '');
}

export function formatXml(xml: string): string {
    return xmlFormat(xml, {
        collapseContent: true,
        lineSeparator: '\n',
    });
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


