import {Suspense} from 'react';
import {type Metadata} from 'next';

import {HomePage} from '@/src/components/HomePage';
import {FeedSkeleton} from '@/src/components/FeedSkeleton';
import {parsePageParam, type PageSearchParams} from '@/src/lib/params';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';

export const metadata: Metadata = buildStaticListMetadata({
    description:
        'Ein offener Kanal für Videospielcontent und das Drumherum – unentgeltlich, unabhängig, ungezwungen. Artikel, Podcasts und mehr zu Gaming, Organisationskultur und HR-Themen.',
    path: '/',
    ogImageAlt: 'Mindestens 10 Zeichen Logo',
});

const HOME_MAX_PAGE = 50;

/**
 * Wraps the HomePage component in a Suspense boundary and provides a skeleton fallback.
 *
 * @returns A root element with `data-homepage` containing `HomePage` rendered inside `Suspense` with `FeedSkeleton` as the fallback.
 */
export default async function HomePageWrapper({searchParams}: {searchParams?: Promise<PageSearchParams>}) {
    const sp = await Promise.resolve(searchParams ?? {});
    const page = parsePageParam(sp, {maxPage: HOME_MAX_PAGE});
    return (
        <div data-homepage>
            <Suspense fallback={<FeedSkeleton />}>
                <HomePage page={page} />
            </Suspense>
        </div>
    );
}