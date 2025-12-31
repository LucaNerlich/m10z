import {type Metadata} from 'next';

import {fetchCategoriesWithContent} from '@/src/lib/strapiContent';
import {absoluteRoute} from '@/src/lib/routes';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';
import {ContentGrid} from '@/src/components/ContentGrid';
import {CategoryCard} from '@/src/components/CategoryCard';

export const metadata: Metadata = {
    title: 'Kategorien',
    description: 'Durchsuchen Sie unsere Inhalte nach Kategorien. Finden Sie Artikel und Podcasts zu verschiedenen Themen.',
    openGraph: {
        type: 'website',
        locale: OG_LOCALE,
        siteName: OG_SITE_NAME,
        url: absoluteRoute('/kategorien'),
        images: [
            {
                url: absoluteRoute('/images/m10z.jpg'),
                width: 1200,
                height: 630,
            },
        ],
    },
    alternates: {
        canonical: absoluteRoute('/kategorien'),
    },
};

export default async function CategoriesPage() {
    const categories = await fetchCategoriesWithContent();

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
