'use cache';

import {type Metadata} from 'next';
import {notFound} from 'next/navigation';

import {fetchArticlesBySlugsBatched, fetchAuthorBySlug, fetchPodcastsBySlugsBatched} from '@/src/lib/strapiContent';
import {getOptimalMediaFormat} from '@/src/lib/rss/media';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {absoluteRoute} from '@/src/lib/routes';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {ContentGrid} from '@/src/components/ContentGrid';
import {ArticleCard} from '@/src/components/ArticleCard';
import {PodcastCard} from '@/src/components/PodcastCard';
import {AuthorHeader} from '@/src/components/AuthorHeader';
import {Section} from '@/src/components/Section';
import {EmptyState} from '@/src/components/EmptyState';
import {sortByDateDesc} from '@/src/lib/effectiveDate';
import styles from './page.module.css';

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return {};

    const author = await fetchAuthorBySlug(slug);
    if (!author) return {};

    const title = author.title || 'Autor';
    const description = author.description || undefined;
    const avatarMedia = getOptimalMediaFormat(author.avatar, 'thumbnail');
    const avatarImage = avatarMedia ? formatOpenGraphImage(avatarMedia) : undefined;

    return {
        title,
        description,
        alternates: {
            canonical: absoluteRoute(`/team/${slug}`),
        },
        openGraph: {
            type: 'profile',
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

    const articleSlugs = author.articles?.map((a) => a.slug).filter(Boolean) ?? [];
    const podcastSlugs = author.podcasts?.map((p) => p.slug).filter(Boolean) ?? [];

    const [articlesResult, podcastsResult] = await Promise.allSettled([
        fetchArticlesBySlugsBatched(articleSlugs),
        fetchPodcastsBySlugsBatched(podcastSlugs),
    ]);

    let articles: Awaited<ReturnType<typeof fetchArticlesBySlugsBatched>> = [];
    let podcasts: Awaited<ReturnType<typeof fetchPodcastsBySlugsBatched>> = [];

    if (articlesResult.status === 'fulfilled') {
        articles = articlesResult.value;
    } else {
        console.error('Failed to fetch articles for author:', articlesResult.reason);
    }

    if (podcastsResult.status === 'fulfilled') {
        podcasts = podcastsResult.value;
    } else {
        console.error('Failed to fetch podcasts for author:', podcastsResult.reason);
    }

    // Sort by date descending
    const sortedArticles = sortByDateDesc(articles);
    const sortedPodcasts = sortByDateDesc(podcasts);

    return (
        <main>
            <AuthorHeader author={author} />

            {sortedArticles.length > 0 ? (
                <Section title={`Artikel (${sortedArticles.length})`}>
                    <ContentGrid gap="comfortable">
                        {sortedArticles.map((article) => (
                            <ArticleCard key={article.slug} article={article} showAuthors={false}
                                         showCategories={true} />
                        ))}
                    </ContentGrid>
                </Section>
            ) : null}

            {sortedPodcasts.length > 0 ? (
                <Section title={`Podcasts (${sortedPodcasts.length})`}>
                    <ContentGrid gap="comfortable">
                        {sortedPodcasts.map((podcast) => (
                            <PodcastCard key={podcast.slug} podcast={podcast} showAuthors={false}
                                         showCategories={true} />
                        ))}
                    </ContentGrid>
                </Section>
            ) : null}

            {sortedArticles.length === 0 && sortedPodcasts.length === 0 ? (
                <EmptyState message="Keine Inhalte von diesem Autor gefunden." />
            ) : null}
        </main>
    );
}
