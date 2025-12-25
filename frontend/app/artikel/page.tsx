'use cache';

import {type Metadata} from 'next';

import {getEffectiveDate, toDateTimestamp} from '@/src/lib/effectiveDate';
import {fetchArticlesList} from '@/src/lib/strapiContent';
import {absoluteRoute} from '@/src/lib/routes';
import {ContentGrid} from '@/src/components/ContentGrid';
import {ArticleCard} from '@/src/components/ArticleCard';

export const metadata: Metadata = {
    title: 'Artikel',
    description: 'Alle Artikel von Mindestens 10 Zeichen. Lesen Sie unsere Beiträge zu Gaming, Organisationskultur, HR-Themen und mehr.',
    alternates: {
        canonical: absoluteRoute('/artikel'),
    },
};

export default async function ArticlePage() {
    const articles = await fetchArticlesList();
    const sorted = [...articles].sort((a, b) => {
        const ad = toDateTimestamp(getEffectiveDate(a)) ?? 0;
        const bd = toDateTimestamp(getEffectiveDate(b)) ?? 0;
        return bd - ad;
    });

    return (
        <section>
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
