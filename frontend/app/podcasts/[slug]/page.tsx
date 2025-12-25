'use cache';

import {type Metadata} from 'next';
import {notFound} from 'next/navigation';
import Image from 'next/image';

import {Markdown} from '@/src/lib/markdown/Markdown';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {mediaUrlToAbsolute, normalizeStrapiMedia, pickCoverMedia, getOptimalMediaFormat} from '@/src/lib/rss/media';
import {fetchPodcastBySlug} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {PodcastPlayer} from './Player';
import {generatePodcastJsonLd} from '@/src/lib/jsonld/podcast';
import {absoluteRoute} from '@/src/lib/routes';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {formatDateShort} from '@/src/lib/dateFormatters';
import {AuthorList} from '@/src/components/AuthorList';
import {CategoryList} from '@/src/components/CategoryList';

type PageProps = {
    params: Promise<{slug: string}>;
};

export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    'use cache';
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return {};

    const episode = await fetchPodcastBySlug(slug);
    if (!episode) return {};

    const title = episode.base.title;
    const description = episode.base.description || undefined;
    const coverMedia = pickCoverMedia(episode.base, episode.categories);
    const coverImage = coverMedia ? formatOpenGraphImage(normalizeStrapiMedia(coverMedia)) : undefined;

    const openGraph: Metadata['openGraph'] = {
        type: 'article',
        title,
        description,
        images: coverImage,
    };

    return {
        title,
        description,
        alternates: {
            canonical: absoluteRoute(`/podcasts/${slug}`),
        },
        openGraph,
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: coverImage,
        },
    };
}

/**
 * Render the podcast episode detail page for the route slug.
 *
 * Fetches the episode by slug, prepares published date, media URL, and JSON-LD, and returns the page JSX.
 *
 * Triggers a 404 response (via `notFound`) if the slug is invalid or no episode is found.
 *
 * @param params - A promise resolving to an object with a `slug` string from the route parameters
 * @returns A React element containing an `application/ld+json` script with episode JSON-LD, the episode metadata (title, date, description), an optional audio player when media is available, and rendered shownotes
 */
export default async function PodcastDetailPage({params}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return notFound();

    const episode = await fetchPodcastBySlug(slug);
    if (!episode) return notFound();

    const published = getEffectiveDate(episode);
    const fileMedia = normalizeStrapiMedia(episode.file);
    const audioUrl = mediaUrlToAbsolute({media: fileMedia});
    const jsonLd = generatePodcastJsonLd(episode);
    const coverMedia = pickCoverMedia(episode.base, episode.categories);
    const optimizedCoverMedia = coverMedia ? getOptimalMediaFormat(normalizeStrapiMedia(coverMedia), 'medium') : undefined;
    const coverImageUrl = optimizedCoverMedia ? mediaUrlToAbsolute({media: optimizedCoverMedia}) : undefined;
    const coverWidth = optimizedCoverMedia?.width;
    const coverHeight = optimizedCoverMedia?.height;

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
            />
            <main>
                <article>
                    {coverImageUrl && coverWidth && coverHeight ? (
                        <Image
                            src={coverImageUrl}
                            alt={episode.base.title}
                            width={coverWidth}
                            height={coverHeight}
                            priority
                            style={{width: '100%', height: 'auto', marginBottom: '1.5rem'}}
                        />
                    ) : null}
                    <header style={{marginBottom: '1.5rem'}}>
                        {published ? (
                            <time dateTime={published} style={{display: 'block', color: 'var(--color-text-muted)', marginBottom: '0.5rem'}}>
                                {formatDateShort(published)}
                            </time>
                        ) : null}
                        <h1 style={{marginBottom: '0.75rem'}}>{episode.base.title}</h1>
                        {episode.base.description ? (
                            <p style={{color: 'var(--color-text-muted)', fontSize: '1.125rem', marginBottom: '1rem'}}>
                                {episode.base.description}
                            </p>
                        ) : null}
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center'}}>
                            {episode.authors && episode.authors.length > 0 ? (
                                <div>
                                    <span style={{fontSize: '0.875rem', color: 'var(--color-text-muted)', marginRight: '0.5rem'}}>Von:</span>
                                    <AuthorList authors={episode.authors} showAvatars={true} layout="inline" />
                                </div>
                            ) : null}
                            {episode.categories && episode.categories.length > 0 ? (
                                <CategoryList categories={episode.categories} />
                            ) : null}
                        </div>
                    </header>

                    {audioUrl ? (
                        <div style={{marginBottom: '2rem'}}>
                            <PodcastPlayer src={audioUrl} />
                        </div>
                    ) : null}

                    <div>
                        <Markdown markdown={episode.shownotes ?? ''} />
                    </div>
                </article>
            </main>
        </>
    );
}