import {type Metadata} from 'next';
import {notFound} from 'next/navigation';

import {
    fetchArticlesByAuthorPaginated,
    fetchAuthorBySlug,
    fetchPodcastsByAuthorPaginated,
} from '@/src/lib/strapiContent';
import {getOptimalMediaFormat} from '@/src/lib/rss/media';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {absoluteRoute} from '@/src/lib/routes';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';
import {ContentGrid} from '@/src/components/ContentGrid';
import {ArticleCard} from '@/src/components/ArticleCard';
import {PodcastCard} from '@/src/components/PodcastCard';
import {AuthorHeader} from '@/src/components/AuthorHeader';

import {EmptyState} from '@/src/components/EmptyState';
import {sortByDateDesc} from '@/src/lib/effectiveDate';
import {AuthorNav} from '@/src/components/AuthorNav';
import Link from 'next/link';
import {Tag} from '@/src/components/Tag';
import {computeAuthorContentStats} from '@/src/lib/authorContentStats';
import styles from './page.module.css';

type PageProps = {
    params: Promise<{slug: string}>;
};

/**
 * Generate page metadata (title, description, Open Graph and Twitter cards) for an author page identified by slug.
 *
 * If the slug is invalid or no matching author is found, returns an empty metadata object.
 *
 * @param params - An object (awaitable) whose resolved `slug` value identifies the author route.
 * @returns A `Metadata` object containing the page `title`, `description`, canonical alternate URL, `openGraph` data (type `'profile'`, `locale: 'de'`, `siteName`, URL, `title`, `description`, and `images` when available) and `twitter` card data; or an empty object if no valid slug or author is found.
 */
export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return {};

    const author = await fetchAuthorBySlug(slug);
    if (!author) return {};

    const title = author.title || 'Autor';
    const description = author.description || undefined;
    const avatarMedia = getOptimalMediaFormat(author.avatar, 'medium');
    const avatarImage = avatarMedia ? formatOpenGraphImage(avatarMedia) : undefined;

    return {
        title,
        description,
        alternates: {
            canonical: absoluteRoute(`/team/${slug}`),
        },
        openGraph: {
            type: 'profile',
            locale: OG_LOCALE,
            siteName: OG_SITE_NAME,
            url: absoluteRoute(`/team/${slug}`),
            title,
            description,
            images: avatarImage,
        },
        twitter: {
            card: 'summary',
            title,
            description,
            images: avatarImage,
        },
    };
}

/**
 * Render the author page for the given route slug.
 *
 * Validates the slug and, if a matching author exists, resolves the author's avatar URL and renders the author's profile including title, optional description, and optional lists of articles and podcasts. If the slug is invalid or no author is found, the function triggers Next.js's notFound response.
 *
 * @param params - A promise resolving to route parameters containing the `slug` string.
 * @returns The page's JSX element containing the author's profile and any associated articles or podcasts.
 */
export default async function AuthorPage({params}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return notFound();

    const author = await fetchAuthorBySlug(slug);
    if (!author) return notFound();

    // Fetch a limited page for previews + category signal; totals come from pagination meta.
    const previewFetchPageSize = 20;
    const previewRenderLimit = 4;

    const [articlesResult, podcastsResult] = await Promise.allSettled([
        fetchArticlesByAuthorPaginated(slug, 1, previewFetchPageSize),
        fetchPodcastsByAuthorPaginated(slug, 1, previewFetchPageSize),
    ]);

    const articlesPage = articlesResult.status === 'fulfilled' ? articlesResult.value : null;
    const podcastsPage = podcastsResult.status === 'fulfilled' ? podcastsResult.value : null;

    if (articlesResult.status === 'rejected') {
        console.error('Failed to fetch articles for author:', articlesResult.reason);
    }
    if (podcastsResult.status === 'rejected') {
        console.error('Failed to fetch podcasts for author:', podcastsResult.reason);
    }

    // Category counts should reflect ALL author content (not just the preview page).
    const allAuthorArticles = (author.articles ?? []).filter((a) => Boolean(a.publishedAt));
    const allAuthorPodcasts = (author.podcasts ?? []).filter((p) => Boolean(p.publishedAt));
    const stats = computeAuthorContentStats(allAuthorArticles, allAuthorPodcasts);

    const sortedArticles = sortByDateDesc(articlesPage?.items ?? []).slice(0, previewRenderLimit);
    const sortedPodcasts = sortByDateDesc(podcastsPage?.items ?? []).slice(0, previewRenderLimit);

    const articleTotal = articlesPage?.pagination.total ?? stats.articles.total;
    const podcastTotal = podcastsPage?.pagination.total ?? stats.podcasts.total;
    const shouldRenderArticleSection = articleTotal > 0 && (sortedArticles.length > 0 || stats.articles.categories.length > 0);
    const shouldRenderPodcastSection = sortedPodcasts.length > 0;

    return (
        <main data-list-page>
            <AuthorHeader author={author} />
            <AuthorNav authorSlug={slug} activeSection="overview" />

            {shouldRenderArticleSection ? (
                <section>
                    <h2>{`Artikel (${articleTotal})`}</h2>
                    <div className={styles.summaryRow}>
                        {stats.articles.categories.slice(0, 6).map((c) => (
                            <Link
                                key={c.slug}
                                href={`/team/${slug}/artikel?category=${encodeURIComponent(c.slug)}`}
                                className={styles.categoryLink}
                            >
                                <Tag>{c.title} ({c.count})</Tag>
                            </Link>
                        ))}
                        <div className={styles.viewAll}>
                            <Link href={`/team/${slug}/artikel`}>Alle ansehen</Link>
                        </div>
                    </div>
                    {sortedArticles.length > 0 ? (
                        <ContentGrid gap="comfortable">
                            {sortedArticles.map((article) => (
                                <ArticleCard key={article.slug} article={article} showAuthors={false}
                                             showCategories={true} />
                            ))}
                        </ContentGrid>
                    ) : (
                        <EmptyState
                            message="Artikel konnten gerade nicht geladen werden. Bitte später erneut versuchen." />
                    )}
                </section>
            ) : null}

            {shouldRenderPodcastSection ? (
                <section>
                    <h2>{`Podcasts (${podcastTotal})`}</h2>
                    <div className={styles.summaryRow}>
                        {stats.podcasts.categories.slice(0, 6).map((c) => (
                            <Link
                                key={c.slug}
                                href={`/team/${slug}/podcasts?category=${encodeURIComponent(c.slug)}`}
                                className={styles.categoryLink}
                            >
                                <Tag>{c.title} ({c.count})</Tag>
                            </Link>
                        ))}
                        <div className={styles.viewAll}>
                            <Link href={`/team/${slug}/podcasts`}>Alle ansehen</Link>
                        </div>
                    </div>
                    <ContentGrid gap="comfortable">
                        {sortedPodcasts.map((podcast) => (
                            <PodcastCard key={podcast.slug} podcast={podcast} showAuthors={false}
                                         showCategories={true} />
                        ))}
                    </ContentGrid>
                </section>
            ) : null}

            {articleTotal === 0 && podcastTotal === 0 ? (
                <EmptyState message="Keine Inhalte von diesem Autor gefunden." />
            ) : null}
        </main>
    );
}
