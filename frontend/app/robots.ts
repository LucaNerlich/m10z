import type {MetadataRoute} from 'next';
import {headers} from 'next/headers';

import {routes} from '@/src/lib/routes';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
    const h = await headers();
    // Fail closed over every host the request mentions. A proxy may append the
    // host it connected to, but we cannot prove which hop it set: if it passed a
    // client value through (single value or a comma-joined list), trusting only
    // one of them would let `X-Forwarded-Host: m10z.de` switch off the staging
    // noindex rule. Deindex when any candidate matches; a spoofed hop can then
    // only add a disallow for its own request, never remove one.
    const candidates = [h.get('host') ?? '', ...(h.get('x-forwarded-host') ?? '').split(',')]
        .map((value) => value.trim().toLowerCase().replace(/:\d+$/, ''))
        .filter(Boolean);

    const noindexHosts = (process.env.NOINDEX_HOSTS || 'localhost,127.0.0.1')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

    // Match host labels, not substrings: `NOINDEX_HOSTS=example.com` must not
    // deindex `notexample.com`, and `m10z.de` must not match `m10z.de.evil.com`.
    const isNoIndex = candidates.some((hostname) =>
        noindexHosts.some((part) => hostname === part || hostname.endsWith(`.${part}`)),
    );

    if (isNoIndex) {
        return {
            rules: [{userAgent: '*', disallow: '/'}],
            sitemap: [],
        };
    }

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/preview/'],
        },
        // routes.siteUrl falls back to https://m10z.de when
        // NEXT_PUBLIC_DOMAIN is unset — never emit "undefined/sitemap.xml".
        sitemap: `${routes.siteUrl}/sitemap.xml`,
    };
}
