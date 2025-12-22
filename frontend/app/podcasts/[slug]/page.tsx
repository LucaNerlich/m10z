'use cache'

import {notFound} from 'next/navigation';

import {Markdown} from '@/src/lib/markdown/Markdown';
import {mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/rss/media';
import {fetchPodcastBySlug} from '@/src/lib/strapiContent';
import {PodcastPlayer} from './Player';

type PageProps = {
    params: Promise<{slug: string}>;
};

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL?.replace(/\/+$/, '');

export default async function PodcastDetailPage({params}: PageProps) {
    const {slug} = await params;
    const episode = await fetchPodcastBySlug(slug);
    if (!episode) return notFound();

    const published = episode.publishedAt ?? null;
    const fileMedia = normalizeStrapiMedia(episode.file);
    const audioUrl = mediaUrlToAbsolute({media: fileMedia, strapiUrl: STRAPI_URL});

    return (
        <main>
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
    );
}
