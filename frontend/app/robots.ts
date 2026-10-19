import type {MetadataRoute} from 'next';
import {headers} from 'next/headers';

import {routes} from '@/src/lib/routes';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
    const h = await headers();
    // Proxies append the host they connect to; Node joins a multi-hop header with
    // commas, so take the last hop — the one hop the proxy set itself. Every
    // entry left of it is client-supplied and spoofable, and trusting it would
    // let a request header switch off the staging noindex rule. Mirrors the
    // `x-forwarded-for` convention in `src/lib/net/getClientIp.ts`.
    const forwardedHost = h.get('x-forwarded-host')?.split(',').pop()?.trim() || '';
    const host = forwardedHost || h.get('host') || '';

    const noindexHosts = (process.env.NOINDEX_HOSTS || 'localhost,127.0.0.1')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

    // Match host labels, not substrings: `NOINDEX_HOSTS=example.com` must not
    // deindex `notexample.com`, and `m10z.de` must not match `m10z.de.evil.com`.
    const hostname = host.toLowerCase().split(':')[0];
    const isNoIndex = noindexHosts.some((part) => hostname === part || hostname.endsWith(`.${part}`));

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
