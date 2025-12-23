'use cache';

import {type Metadata} from 'next';
import {notFound} from 'next/navigation';

import {Markdown} from '@/src/lib/markdown/Markdown';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {mediaUrlToAbsolute, normalizeStrapiMedia, pickCoverMedia} from '@/src/lib/rss/media';
import {fetchPodcastBySlug} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {PodcastPlayer} from './Player';
import {generatePodcastJsonLd} from '@/src/lib/jsonld/podcast';
import {absoluteRoute} from '@/src/lib/routes';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {formatIso8601Date} from '@/src/lib/jsonld/helpers';

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
    const fileMedia = normalizeStrapiMedia(episode.file);
    const audioUrl = mediaUrlToAbsolute({media: fileMedia});

    const openGraph: Metadata['openGraph'] = {
        type: 'music.song',
        title,
        description,
        images: coverImage,
    };

    if (audioUrl) {
        openGraph.audio = [
            {
                url: audioUrl,
            },
        ];
    }

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

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
            />
            <main>
                <h2>TODO</h2>
                <p>{published ? new Date(published).toLocaleDateString('de-DE') : ''}</p>
                <h1>{episode.base.title}</h1>
                {episode.base.description ? <p>{episode.base.description}</p> : null}

                {audioUrl ? (
                    <div>
                        <PodcastPlayer src={audioUrl} />
                    </div>
                ) : null}

                <Markdown markdown={episode.shownotes ?? ''} />
            </main>
        </>
    );
}