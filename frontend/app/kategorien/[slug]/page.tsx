'use cache';

import {type Metadata} from 'next';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {notFound} from 'next/navigation';
import {fetchArticlesBySlugsBatched, fetchCategoryBySlug, fetchPodcastsBySlugsBatched} from '@/src/lib/strapiContent';
import {absoluteRoute} from '@/src/lib/routes';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {normalizeStrapiMedia} from '@/src/lib/rss/media';
import {ContentGrid} from '@/src/components/ContentGrid';
import {ArticleCard} from '@/src/components/ArticleCard';
import {PodcastCard} from '@/src/components/PodcastCard';
import {getEffectiveDate, toDateTimestamp} from '@/src/lib/effectiveDate';
import styles from './page.module.css';

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    'use cache';
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return {};

    const category = await fetchCategoryBySlug(slug);
    if (!category) return {};

    const title = category.base?.title || category.slug || 'Kategorie';
    const description = category.base?.description || undefined;
    const coverMedia = category.base?.cover
        ? normalizeStrapiMedia(category.base.cover)
        : undefined;
    const coverImage = coverMedia
        ? formatOpenGraphImage(coverMedia)
        : [
            {
                url: absoluteRoute('/images/m10z.jpg'),
                alt: 'Mindestens 10 Zeichen',
            },
        ];

    return {
        title,
        description,
        alternates: {
            canonical: absoluteRoute(`/kategorien/${slug}`),
        },
        openGraph: {
            type: 'website',
            title,
            description,
            images: coverImage,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: coverImage,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}

/**
 * Renders the category detail page for a validated route slug.
 *
 * Validates the incoming `slug` route parameter and returns a 404 page when the slug is invalid; otherwise renders the category detail JSX.
 *
 * @param params - An object providing route parameters (must include `slug`)
 * @returns The page's JSX content when `slug` is valid; invokes a 404 response when `slug` is invalid
 */
export default async function CategoryDetailPage({params}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return notFound();

    const category = await fetchCategoryBySlug(slug);
    if (!category) return notFound();

    const articleSlugs = category.articles?.map((a) => a.slug).filter(Boolean) ?? [];
    const podcastSlugs = category.podcasts?.map((p) => p.slug).filter(Boolean) ?? [];

    const [articles, podcasts] = await Promise.all([
        fetchArticlesBySlugsBatched(articleSlugs),
        fetchPodcastsBySlugsBatched(podcastSlugs),
    ]);

    // Sort by date descending
    const sortedArticles = [...articles].sort((a, b) => {
        const ad = toDateTimestamp(getEffectiveDate(a)) ?? 0;
        const bd = toDateTimestamp(getEffectiveDate(b)) ?? 0;
        return bd - ad;
    });

    const sortedPodcasts = [...podcasts].sort((a, b) => {
        const ad = toDateTimestamp(getEffectiveDate(a)) ?? 0;
        const bd = toDateTimestamp(getEffectiveDate(b)) ?? 0;
        return bd - ad;
    });

    const title = category.base?.title ?? category.slug ?? 'Kategorie';

    return (
        <main>
            <header className={styles.header}>
                <h1 className={styles.title}>{title}</h1>
                {category.base?.description ? (
                    <p className={styles.description}>
                        {category.base.description}
                    </p>
                ) : null}
            </header>

            {sortedArticles.length > 0 ? (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Artikel ({sortedArticles.length})</h2>
                    <ContentGrid gap="comfortable">
                        {sortedArticles.map((article) => (
                            <ArticleCard key={article.slug} article={article} showAuthors={true}
                                         showCategories={false} />
                        ))}
                    </ContentGrid>
                </section>
            ) : null}

            {sortedPodcasts.length > 0 ? (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Podcasts ({sortedPodcasts.length})</h2>
                    <ContentGrid gap="comfortable">
                        {sortedPodcasts.map((podcast) => (
                            <PodcastCard key={podcast.slug} podcast={podcast} showAuthors={true}
                                         showCategories={false} />
                        ))}
                    </ContentGrid>
                </section>
            ) : null}

            {sortedArticles.length === 0 && sortedPodcasts.length === 0 ? (
                <p className={styles.emptyState}>Keine Inhalte in dieser Kategorie gefunden.</p>
            ) : null}
        </main>
    );
}
