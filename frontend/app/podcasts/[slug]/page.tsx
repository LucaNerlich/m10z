'use cache';

import {notFound} from 'next/navigation';

import {Markdown} from '@/src/lib/markdown/Markdown';
import {getEffectiveDate} from '@/src/lib/effectiveDate';
import {mediaUrlToAbsolute, normalizeStrapiMedia} from '@/src/lib/rss/media';
import {fetchPodcastBySlug} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {PodcastPlayer} from './Player';

type PageProps = {
    params: Promise<{slug: string}>;
};

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL?.replace(/\/+$/, '');

export default async function PodcastDetailPage({params}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return notFound();
    
    const episode = await fetchPodcastBySlug(slug);
    if (!episode) return notFound();

    const published = getEffectiveDate(episode);
    const fileMedia = normalizeStrapiMedia(episode.file);
    const audioUrl = mediaUrlToAbsolute({media: fileMedia, strapiUrl: STRAPI_URL});

    return (
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
    );
}
