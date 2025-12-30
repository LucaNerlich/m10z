import {type Metadata} from 'next';

import {sortByDateDesc} from '@/src/lib/effectiveDate';
import {fetchArticlesList} from '@/src/lib/strapiContent';
import {absoluteRoute} from '@/src/lib/routes';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';
import {ContentGrid} from '@/src/components/ContentGrid';
import {ArticleCard} from '@/src/components/ArticleCard';

export const metadata: Metadata = {
    title: 'Artikel',
    description: 'Alle Artikel von Mindestens 10 Zeichen. Lesen Sie unsere Beiträge zu Gaming, Organisationskultur, HR-Themen und mehr.',
    openGraph: {
        type: 'website',
        locale: OG_LOCALE,
        siteName: OG_SITE_NAME,
        url: absoluteRoute('/artikel'),
    },
    alternates: {
        canonical: absoluteRoute('/artikel'),
    },
};

export default async function ArticlePage() {
    const articles = await fetchArticlesList();
    const sorted = sortByDateDesc(articles);

    return (
        <section data-list-page>
            <h1>Artikel</h1>
            {sorted.length === 0 ? (
                <p>Keine Artikel gefunden.</p>
            ) : (
                <ContentGrid gap="comfortable">
                    {sorted.map((article) => (
                        <ArticleCard
                            key={article.slug}
                            article={article}
                            showAuthors={true}
                            showCategories={true}
                        />
                    ))}
                </ContentGrid>
            )}
        </section>
    );
}
