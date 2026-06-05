import {type Metadata} from 'next';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {notFound} from 'next/navigation';
import {fetchCategoryBySlug, fetchCategoryPageData} from '@/src/lib/strapiContent';
import {buildContentSlugMetadata} from '@/src/lib/metadata/contentSlugMetadata';
import {ContentGrid} from '@/src/components/ContentGrid';
import {ArticleCard} from '@/src/components/ArticleCard';
import {PodcastCard} from '@/src/components/PodcastCard';

import {EmptyState} from '@/src/components/EmptyState';
import {getErrorMessage, isTimeoutOrSocketError} from '@/src/lib/errors';
import {generateBreadcrumbJsonLd} from '@/src/lib/jsonld/breadcrumb';
import {generateCategoryJsonLd} from '@/src/lib/jsonld/category';
import {stringifyJsonLd} from '@/src/lib/jsonld/helpers';
import {fetchPublishedSlugs} from '@/src/lib/publishedSlugs';
import {sitemapTag} from '@/src/lib/strapi/cacheTags';
import Script from 'next/script';
import styles from './page.module.css';

type PageProps = {
    params: Promise<{slug: string}>;
};

/**
 * Pre-generate static params for all published categories at build time.
 * Returns an empty array if the CMS is unreachable, allowing ISR at runtime.
 */
export async function generateStaticParams() {
    try {
        const entries = await fetchPublishedSlugs('categories', [sitemapTag('categories')]);
        return entries.map(({slug}) => ({slug}));
    } catch {
        return [];
    }
}

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
    return buildContentSlugMetadata({
        params,
        canonicalPath: (slug) => `/kategorien/${slug}`,
        contentLabel: 'category',
        fetchBySlug: fetchCategoryBySlug,
        getTitle: (category) => category.title || category.slug || 'Kategorie',
        getDescription: (category) => category.description || undefined,
        getMediaSource: (category) => category,
        getMetadataExtras: () => ({
            robots: {index: true, follow: true},
        }),
    });
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

    let pageData;
    try {
        pageData = await fetchCategoryPageData(slug);
        if (!pageData) return notFound();
    } catch (error) {
        const errorMessage = getErrorMessage(error);

        if (isTimeoutOrSocketError(error)) {
            console.error(`Socket/timeout error fetching category for slug "${slug}":`, errorMessage);
        } else {
            console.error(`Error fetching category for slug "${slug}":`, errorMessage);
        }

        return notFound();
    }

    const {category, articles: sortedArticles, podcasts: sortedPodcasts} = pageData;
    const title = category.title ?? category.slug ?? 'Kategorie';

    const breadcrumbJsonLd = generateBreadcrumbJsonLd([
        {name: 'Startseite', path: '/'},
        {name: 'Kategorien', path: '/kategorien'},
        {name: title, path: `/kategorien/${slug}`},
    ]);

    const categoryJsonLd = generateCategoryJsonLd({
        title,
        description: category.description ?? undefined,
        slug,
        articleSlugs: sortedArticles.map((a) => a.slug),
        podcastSlugs: sortedPodcasts.map((p) => p.slug),
    });

    return (
        <div data-list-page>
            <Script
                id={`jsonld-breadcrumb-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html: stringifyJsonLd(breadcrumbJsonLd)}}
            />
            <Script
                id={`jsonld-category-${slug}`}
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html: stringifyJsonLd(categoryJsonLd)}}
            />
            <header className={styles.header}>
                <h1 className={styles.title}>{title}</h1>
                {category.description ? (
                    <p className={styles.description}>
                        {category.description}
                    </p>
                ) : null}
            </header>

            {sortedArticles.length > 0 ? (
                <section>
                    <h2>{`Artikel (${sortedArticles.length})`}</h2>
                    <ContentGrid gap="comfortable">
                        {sortedArticles.map((article) => (
                            <ArticleCard key={article.slug} article={article} showAuthors={true}
                                         showCategories={false} />
                        ))}
                    </ContentGrid>
                </section>
            ) : null}

            {sortedPodcasts.length > 0 ? (
                <section>
                    <h2>{`Podcasts (${sortedPodcasts.length})`}</h2>
                    <ContentGrid gap="comfortable">
                        {sortedPodcasts.map((podcast) => (
                            <PodcastCard key={podcast.slug} podcast={podcast} showAuthors={true}
                                         showCategories={false} />
                        ))}
                    </ContentGrid>
                </section>
            ) : null}

            {sortedArticles.length === 0 && sortedPodcasts.length === 0 ? (
                <EmptyState message="Keine Inhalte in dieser Kategorie gefunden." />
            ) : null}
        </div>
    );
}
