import {type Metadata} from 'next';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {notFound} from 'next/navigation';
import {fetchArticlesBySlugsBatched, fetchCategoryBySlug, fetchPodcastsBySlugsBatched} from '@/src/lib/strapiContent';
import {absoluteRoute} from '@/src/lib/routes';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';
import {getOptimalMediaFormat, pickBannerOrCoverMedia} from '@/src/lib/rss/media';
import {ContentGrid} from '@/src/components/ContentGrid';
import {ArticleCard} from '@/src/components/ArticleCard';
import {PodcastCard} from '@/src/components/PodcastCard';
import {Section} from '@/src/components/Section';
import {EmptyState} from '@/src/components/EmptyState';
import {sortByDateDesc} from '@/src/lib/effectiveDate';
import styles from './page.module.css';

type PageProps = {
    params: Promise<{slug: string}>;
};

/**
 * Builds metadata for a category page based on the route `slug`.
 *
 * Fetches the category by slug and constructs title, description, canonical alternates,
 * Open Graph (including locale, siteName, url, images), Twitter card data, and robots directives.
 *
 * @param params - Route parameters object. Expects `params.slug` to identify the category.
 * @returns The assembled `Metadata` for the category page (title, description, alternates, `openGraph`, `twitter`, and `robots`).
 */
export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return {};

    const category = await fetchCategoryBySlug(slug);
    if (!category) return {};

    const title = category.base?.title || category.slug || 'Kategorie';
    const description = category.base?.description || undefined;
    const bannerOrCoverMedia = pickBannerOrCoverMedia(undefined, [category]);
    const optimizedMedia = bannerOrCoverMedia ? getOptimalMediaFormat(bannerOrCoverMedia, 'medium') : undefined;
    const coverImage = optimizedMedia ? formatOpenGraphImage(optimizedMedia) : undefined;

    return {
        title,
        description,
        alternates: {
            canonical: absoluteRoute(`/kategorien/${slug}`),
        },
        openGraph: {
            type: 'website',
            locale: OG_LOCALE,
            siteName: OG_SITE_NAME,
            url: absoluteRoute(`/kategorien/${slug}`),
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
    const sortedArticles = sortByDateDesc(articles);
    const sortedPodcasts = sortByDateDesc(podcasts);

    const title = category.base?.title ?? category.slug ?? 'Kategorie';

    return (
        <main data-list-page>
            <header className={styles.header}>
                <h1 className={styles.title}>{title}</h1>
                {category.base?.description ? (
                    <p className={styles.description}>
                        {category.base.description}
                    </p>
                ) : null}
            </header>

            {sortedArticles.length > 0 ? (
                <Section title={`Artikel (${sortedArticles.length})`}>
                    <ContentGrid gap="comfortable">
                        {sortedArticles.map((article) => (
                            <ArticleCard key={article.slug} article={article} showAuthors={true}
                                         showCategories={false} />
                        ))}
                    </ContentGrid>
                </Section>
            ) : null}

            {sortedPodcasts.length > 0 ? (
                <Section title={`Podcasts (${sortedPodcasts.length})`}>
                    <ContentGrid gap="comfortable">
                        {sortedPodcasts.map((podcast) => (
                            <PodcastCard key={podcast.slug} podcast={podcast} showAuthors={true}
                                         showCategories={false} />
                        ))}
                    </ContentGrid>
                </Section>
            ) : null}

            {sortedArticles.length === 0 && sortedPodcasts.length === 0 ? (
                <EmptyState message="Keine Inhalte in dieser Kategorie gefunden." />
            ) : null}
        </main>
    );
}
