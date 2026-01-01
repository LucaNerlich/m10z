import {Suspense} from 'react';
import {type Metadata} from 'next';

import {HomePage} from '@/src/components/HomePage';
import {FeedSkeleton} from '@/src/components/FeedSkeleton';
import {absoluteRoute} from '@/src/lib/routes';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';

export const metadata: Metadata = {
    description: 'Ein offener Kanal für Videospielcontent und das Drumherum – unentgeltlich, unabhängig, ungezwungen. Artikel, Podcasts und mehr zu Gaming, Organisationskultur und HR-Themen.',
    openGraph: {
        type: 'website',
        locale: OG_LOCALE,
        siteName: OG_SITE_NAME,
        url: absoluteRoute('/'),
        images: [
            {
                url: absoluteRoute('/images/m10z.jpg'),
                alt: 'Mindestens 10 Zeichen',
            },
        ],
    },
    alternates: {
        canonical: absoluteRoute('/'),
    },
};

type PageProps = {
    searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

function parsePageParamFromSearchParams(searchParams: Record<string, string | string[] | undefined>): number {
    const raw = searchParams.page;
    const rawString = Array.isArray(raw) ? raw[0] : raw;
    const parsed = Number(rawString);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.min(Math.floor(parsed), 50);
}

/**
 * Wraps the HomePage component in a Suspense boundary and provides a skeleton fallback.
 *
 * @returns A root element with `data-homepage` containing `HomePage` rendered inside `Suspense` with `FeedSkeleton` as the fallback.
 */
export default async function HomePageWrapper({searchParams}: PageProps) {
    const sp = await Promise.resolve(searchParams ?? {});
    const page = parsePageParamFromSearchParams(sp);
    return (
        <div data-homepage>
            <Suspense fallback={<FeedSkeleton />}>
                <HomePage page={page} />
            </Suspense>
        </div>
    );
}