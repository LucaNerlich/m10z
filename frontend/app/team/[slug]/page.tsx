'use cache';

import {type Metadata} from 'next';
import Image from 'next/image';
import {notFound} from 'next/navigation';

import {fetchAuthorBySlug, fetchArticlesBySlugs, fetchPodcastsBySlugs} from '@/src/lib/strapiContent';
import {getOptimalMediaFormat, mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/rss/media';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {absoluteRoute} from '@/src/lib/routes';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {ContentGrid} from '@/src/components/ContentGrid';
import {ArticleCard} from '@/src/components/ArticleCard';
import {PodcastCard} from '@/src/components/PodcastCard';
import {getEffectiveDate, toDateTimestamp} from '@/src/lib/effectiveDate';

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    'use cache';
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

    const avatar = getOptimalMediaFormat(normalizeStrapiMedia(author.avatar), 'small');
    const avatarUrl = mediaUrlToAbsolute({media: avatar});
    const avatarWidth = avatar.width ?? 96;
    const avatarHeight = avatar.height ?? 96;

    const articleSlugs = author.articles?.map((a) => a.slug).filter(Boolean) ?? [];
    const podcastSlugs = author.podcasts?.map((p) => p.slug).filter(Boolean) ?? [];

    const [articles, podcasts] = await Promise.all([
        fetchArticlesBySlugs(articleSlugs),
        fetchPodcastsBySlugs(podcastSlugs),
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

    return (
        <main>
            <header style={{marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem'}}>
                {avatarUrl ? (
                    <Image
                        src={avatarUrl}
                        alt={author.title ?? 'Avatar'}
                        width={avatarWidth}
                        height={avatarHeight}
                        style={{borderRadius: '50%', border: '2px solid var(--color-border)'}}
                    />
                ) : null}
                <h1>{author.title ?? 'Unbekannter Autor'}</h1>
                {author.description ? (
                    <p style={{color: 'var(--color-text-muted)', fontSize: '1.125rem', maxWidth: '600px'}}>
                        {author.description}
                    </p>
                ) : null}
            </header>

            {sortedArticles.length > 0 ? (
                <section style={{marginBottom: '3rem'}}>
                    <h2 style={{marginBottom: '1.5rem'}}>Artikel ({sortedArticles.length})</h2>
                    <ContentGrid gap="comfortable">
                        {sortedArticles.map((article) => (
                            <ArticleCard key={article.slug} article={article} showAuthors={false} showCategories={true} />
                        ))}
                    </ContentGrid>
                </section>
            ) : null}

            {sortedPodcasts.length > 0 ? (
                <section>
                    <h2 style={{marginBottom: '1.5rem'}}>Podcasts ({sortedPodcasts.length})</h2>
                    <ContentGrid gap="comfortable">
                        {sortedPodcasts.map((podcast) => (
                            <PodcastCard key={podcast.slug} podcast={podcast} showAuthors={false} showCategories={true} />
                        ))}
                    </ContentGrid>
                </section>
            ) : null}

            {sortedArticles.length === 0 && sortedPodcasts.length === 0 ? (
                <p style={{color: 'var(--color-text-muted)'}}>Keine Inhalte von diesem Autor gefunden.</p>
            ) : null}
        </main>
    );
}
