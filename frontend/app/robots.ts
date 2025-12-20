import type {MetadataRoute} from 'next';
import {headers} from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
    const h = await headers();
    const forwardedHost = h.get('x-forwarded-host') || '';
    const host = forwardedHost || h.get('host') || '';

    const noindexHosts = (process.env.NOINDEX_HOSTS || 'localhost,127.0.0.1')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

    const isNoIndex = noindexHosts.some((part) => host.toLowerCase().includes(part));

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
            disallow: '/api/',
        },
        sitemap: `${process.env.NEXT_PUBLIC_DOMAIN}/sitemap.xml`,
    };
}
