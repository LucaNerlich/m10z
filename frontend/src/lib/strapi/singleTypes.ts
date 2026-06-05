import qs from 'qs';
import {cache} from 'react';

import {CACHE_REVALIDATE_DEFAULT} from '@/src/lib/cache/constants';
import {
    ABOUT_PAGE_TAG,
    ABOUT_TAG,
    LEGAL_TAGS,
    feedSourceTag,
} from '@/src/lib/strapi/cacheTags';
import {fetchStrapiSingle, type FetchStrapiOptions} from '@/src/lib/strapi/reads';
import type {StrapiMediaRef} from '@/src/lib/strapi/media';

export type StrapiLegalDoc = {
    id: number;
    documentId: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
};

export type StrapiAbout = {
    id: number;
    documentId: string;
    name: string;
    alternateName: string | null;
    content: string;
    logo: StrapiMediaRef | null;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
};

export type StrapiFeedsInfo = {
    id: number;
    documentId: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
};

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

async function getLegalDocWithFallback(
    kind: 'imprint' | 'privacy',
    options: FetchStrapiOptions = {},
): Promise<StrapiLegalDoc> {
    const nowIso = new Date().toISOString();
    const fallback: StrapiLegalDoc = {
        id: -1,
        documentId: `fallback-${kind}`,
        title: kind === 'imprint' ? 'Impressum' : 'Datenschutz',
        content:
            kind === 'imprint'
                ? 'Das Impressum konnte leider nicht geladen werden. Bitte versuche es später erneut.'
                : 'Die Datenschutzerklärung konnte leider nicht geladen werden. Bitte versuche es später erneut.',
        createdAt: nowIso,
        updatedAt: nowIso,
        publishedAt: null,
    };

    try {
        const res = await fetchStrapiSingle<StrapiLegalDoc>(kind, '', {
            ...options,
            tags: options.tags ?? [...LEGAL_TAGS],
        });
        assertIsLegalDoc(res.data);
        return res.data;
    } catch (err) {
        console.warn(`[legal-doc] Failed to fetch ${kind}: ${err instanceof Error ? err.message : 'unknown error'}`);
        return fallback;
    }
}

export const getImprint = cache(async (options: FetchStrapiOptions = {}) => {
    return getLegalDocWithFallback('imprint', {
        ...options,
        revalidate: options.revalidate ?? CACHE_REVALIDATE_DEFAULT,
    });
});

export const getPrivacy = cache(async (options: FetchStrapiOptions = {}) => {
    return getLegalDocWithFallback('privacy', {
        ...options,
        revalidate: options.revalidate ?? CACHE_REVALIDATE_DEFAULT,
    });
});

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

async function getAboutWithFallback(options: FetchStrapiOptions = {}): Promise<StrapiAbout> {
    const nowIso = new Date().toISOString();
    const fallback: StrapiAbout = {
        id: -1,
        documentId: 'fallback-about',
        name: 'Über Uns',
        alternateName: null,
        content:
            'Diese Seite erklärt, wie du die Feeds von Mindestens 10 Zeichen nutzen kannst.\n\n'
            + '- Artikel-Feed: `/rss.xml`\n'
            + '- Podcast-Feed: `/audiofeed.xml`\n\n'
            + 'Du kannst diese URLs in deinem RSS-Reader oder Podcast-Client abonnieren.',
        logo: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        publishedAt: null,
    };

    try {
        const query = qs.stringify(
            {populate: {logo: {fields: ['url', 'width', 'height', 'blurhash', 'alternativeText', 'formats']}}},
            {encodeValuesOnly: true},
        );
        const res = await fetchStrapiSingle<StrapiAbout>('about', query, {
            ...options,
            tags: options.tags ?? [ABOUT_TAG, ABOUT_PAGE_TAG],
        });
        assertIsAbout(res.data);
        return res.data;
    } catch (err) {
        console.warn(`[about] Failed to fetch about: ${err instanceof Error ? err.message : 'unknown error'}`);
        return fallback;
    }
}

export const getAbout = cache(async (options: FetchStrapiOptions = {}) => {
    return getAboutWithFallback({
        ...options,
        revalidate: options.revalidate ?? CACHE_REVALIDATE_DEFAULT,
    });
});

function assertIsFeeds(data: unknown): asserts data is StrapiFeedsInfo {
    if (!data || typeof data !== 'object') throw new Error('Invalid Strapi data');
    const d = data as Partial<StrapiFeedsInfo>;

    if (typeof d.title !== 'string' || d.title.length === 0) {
        throw new Error('Invalid Strapi feeds: missing title');
    }
}

async function getFeedsInfoWithFallback(options: FetchStrapiOptions = {}): Promise<StrapiFeedsInfo> {
    const feed = `${process.env.NEXT_PUBLIC_DOMAIN}/rss.xml`;
    const audioFeed = `${process.env.NEXT_PUBLIC_DOMAIN}/audiofeed.xml`;
    const nowIso = new Date().toISOString();
    const fallback: StrapiFeedsInfo = {
        id: -1,
        documentId: 'fallback-feeds',
        title: 'RSS-Feeds',
        content:
            'Diese Seite erklärt, wie du die Feeds von Mindestens 10 Zeichen nutzen kannst.\n\n'
            + `- Artikel-Feed: \`${feed}\`\n`
            + `- Podcast-Feed: \`${audioFeed}\`\n\n`
            + 'Du kannst diese URLs in deinem RSS-Reader oder Podcast-Client abonnieren.',
        createdAt: nowIso,
        updatedAt: nowIso,
        publishedAt: null,
    };

    try {
        const res = await fetchStrapiSingle<StrapiFeedsInfo>('about-feed', '', {
            ...options,
            tags: options.tags ?? [feedSourceTag('article')],
        });
        assertIsFeeds(res.data);
        return {
            ...res.data,
            content: typeof (res.data as {content?: unknown}).content === 'string' ? (res.data as StrapiFeedsInfo).content : '',
        };
    } catch (err) {
        console.warn(`[feeds] Failed to fetch feeds: ${err instanceof Error ? err.message : 'unknown error'}`);
        return fallback;
    }
}

export const getFeedsInfo = cache(async (options: FetchStrapiOptions = {}) => {
    return getFeedsInfoWithFallback({
        ...options,
        revalidate: options.revalidate ?? CACHE_REVALIDATE_DEFAULT,
    });
});
