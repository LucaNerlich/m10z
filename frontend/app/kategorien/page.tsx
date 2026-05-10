import {type Metadata} from 'next';

import {fetchCategoriesWithContent} from '@/src/lib/strapiContent';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
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
    } catch {
        return (
            <section data-list-page>
                <h1>Kategorien</h1>
                <Card variant="empty">
                    <p>Fehler beim Laden der Kategorien.</p>
                    <a href="/kategorien" style={{marginTop: '1rem', padding: '0.5rem 1rem', display: 'inline-block'}}>
                        Erneut versuchen
                    </a>
                </Card>
            </section>
        );
    }

    return (
        <section data-list-page>
            <h1>Kategorien</h1>
            {categories.length === 0 ? (
                <p>Keine Kategorien gefunden.</p>
            ) : (
                <ContentGrid gap="comfortable">
                    {categories.map((category) => (
                        <CategoryCard
                            key={category.slug ?? category.id}
                            category={category}
                            articleCount={category.articles?.length}
                            podcastCount={category.podcasts?.length}
                        />
                    ))}
                </ContentGrid>
            )}
        </section>
    );
}
