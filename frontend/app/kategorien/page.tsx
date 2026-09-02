import Link from 'next/link';
import {type Metadata} from 'next';

import {fetchCategoriesWithContent} from '@/src/lib/strapiContent';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
import {getErrorMessage} from '@/src/lib/errors';
import {splitCategoriesByActivity} from '@/src/lib/categoryActivity';
import {ContentGrid} from '@/src/components/ContentGrid';
import {CategoryCard} from '@/src/components/CategoryCard';
import {Card} from '@/src/components/Card';

export const metadata: Metadata = buildStaticListMetadata({
    title: 'Kategorien',
    description:
        'Durchsuchen Sie unsere Inhalte nach Kategorien. Finden Sie Artikel und Podcasts zu verschiedenen Themen.',
    path: '/kategorien',
    ogImageAlt: 'Kategorien auf Mindestens 10 Zeichen',
});

export default async function CategoriesPage() {
    let categories;
    try {
        categories = await fetchCategoriesWithContent();
    } catch (error) {
        console.error('CategoriesPage: failed to load categories:', getErrorMessage(error));
        return (
            <section data-list-page>
                <h1>Kategorien</h1>
                <Card variant="empty">
                    <p>Fehler beim Laden der Kategorien.</p>
                    <Link href="/kategorien" style={{marginTop: '1rem', padding: '0.5rem 1rem', display: 'inline-block'}}>
                        Erneut versuchen
                    </Link>
                </Card>
            </section>
        );
    }

    const {active, archived} = splitCategoriesByActivity(categories);

    return (
        <section data-list-page>
            <h1>Kategorien</h1>
            {categories.length === 0 ? (
                <p>Keine Kategorien gefunden.</p>
            ) : (
                <>
                    {active.length > 0 ? (
                        <>
                            <h2>Aktiv</h2>
                            <ContentGrid gap="comfortable">
                                {active.map((category) => (
                                    <CategoryCard
                                        key={category.slug ?? category.id}
                                        category={category}
                                        articleCount={category.articles?.length}
                                        podcastCount={category.podcasts?.length}
                                    />
                                ))}
                            </ContentGrid>
                        </>
                    ) : null}
                    {archived.length > 0 ? (
                        <>
                            <h2>Archiv</h2>
                            <ContentGrid gap="comfortable">
                                {archived.map((category) => (
                                    <CategoryCard
                                        key={category.slug ?? category.id}
                                        category={category}
                                        articleCount={category.articles?.length}
                                        podcastCount={category.podcasts?.length}
                                    />
                                ))}
                            </ContentGrid>
                        </>
                    ) : null}
                </>
            )}
        </section>
    );
}
