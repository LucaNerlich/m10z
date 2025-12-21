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

    const published = episode.publishDate ?? episode.publishedAt ?? null;
    const fileMedia = normalizeStrapiMedia(episode.file);
    const audioUrl = mediaUrlToAbsolute({media: fileMedia, strapiUrl: STRAPI_URL});

    return (
        <main style={{padding: '24px 20px', maxWidth: 960, margin: '0 auto'}}>
            <p style={{color: 'var(--color-text-muted)', marginBottom: 6}}>
                {published ? new Date(published).toLocaleDateString('de-DE') : ''}
            </p>
            <h1 style={{margin: '0 0 12px'}}>{episode.base.title}</h1>
            {episode.base.description ? (
                <p style={{marginBottom: 16, color: 'var(--color-text-muted)'}}>{episode.base.description}</p>
            ) : null}

            {audioUrl ? (
                <div style={{margin: '12px 0 20px'}}>
                    <PodcastPlayer src={audioUrl} />
                </div>
            ) : null}

            <Markdown markdown={episode.shownotes ?? ''} />
        </main>
    );
}
