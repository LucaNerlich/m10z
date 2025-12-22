import {NextResponse} from 'next/server';

import {getStrapiApiBaseUrl} from '@/src/lib/strapi';

function getAuthHeader(): Record<string, string> | undefined {
    const token = process.env.STRAPI_API_TOKEN;
    if (!token) return undefined;
    return {Authorization: `Bearer ${token}`};
}

function unwrapSearchIndex(body: any) {
    const data = body?.data ?? body;
    const attrs = data?.attributes ?? data;
    return attrs?.content ?? body?.content ?? body;
}

export async function GET() {
    const base = getStrapiApiBaseUrl();
    const url = new URL('/api/search-index', base);

    const res = await fetch(url, {
        headers: getAuthHeader(),
        next: {revalidate: 3600, tags: ['search-index']},
    });

    if (!res.ok) {
        return NextResponse.json({error: 'Failed to fetch search index'}, {status: 502});
    }

    const json = await res.json();
    const content = unwrapSearchIndex(json);

    if (!content || typeof content !== 'object') {
        return NextResponse.json({error: 'Malformed search index'}, {status: 500});
    }

    return NextResponse.json(content, {
        headers: {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
    });
}

