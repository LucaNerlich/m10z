import {type Metadata} from 'next';
import {Suspense} from 'react';

import {ArticleListPage} from '@/src/components/ArticleListPage';
import {ArticleListSkeleton} from '@/src/components/ArticleListSkeleton';
import {absoluteRoute} from '@/src/lib/routes';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';

export const metadata: Metadata = {
    title: 'Artikel',
    description: 'Alle Artikel von Mindestens 10 Zeichen. Lesen Sie unsere Beiträge zu Gaming, Organisationskultur, HR-Themen und mehr.',
    openGraph: {
        type: 'website',
        locale: OG_LOCALE,
        siteName: OG_SITE_NAME,
        url: absoluteRoute('/artikel'),
        images: [
            {
                url: absoluteRoute('/images/m10z.jpg'),
                width: 1200,
                height: 630,
            },
        ],
    },
    alternates: {
        canonical: absoluteRoute('/artikel'),
    },
};

/**
 * Renders the article listing page for the /artikel route.
 *
 * Wraps the ArticleListPage component in a Suspense boundary and provides a skeleton fallback.
 *
 * @returns The JSX element that displays the article list page.
 */
export default function ArticlePage() {
    return (
        <Suspense fallback={<ArticleListSkeleton />}>
            <ArticleListPage />
        </Suspense>
    );
}