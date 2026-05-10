import {type Metadata} from 'next';
import {Suspense} from 'react';

import {ArticleListPage} from '@/src/components/ArticleListPage';
import {ArticleListSkeleton} from '@/src/components/ArticleListSkeleton';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';

export const metadata: Metadata = buildStaticListMetadata({
    title: 'Artikel',
    description:
        'Alle Artikel von Mindestens 10 Zeichen. Lesen Sie unsere Beiträge zu Gaming, Organisationskultur, HR-Themen und mehr.',
    path: '/artikel',
    ogImageAlt: 'Artikel auf Mindestens 10 Zeichen',
});

/**
 * Renders the article listing page for the /artikel route.
 *
 * Wraps the ArticleListPage component in a Suspense boundary and provides a skeleton fallback.
 *
 * @returns The JSX element that displays the article list page.
 */
export default function ArticlePage({
                                        searchParams,
                                    }: {
    searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
    return (
        <Suspense fallback={<ArticleListSkeleton />}>
            <ArticleListPage searchParams={searchParams} />
        </Suspense>
    );
}
