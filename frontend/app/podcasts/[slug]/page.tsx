import {type Metadata} from 'next';
import {notFound} from 'next/navigation';

import {fetchPodcastBySlug, fetchRelatedArticles, fetchRelatedPodcasts} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {buildContentSlugMetadata} from '@/src/lib/metadata/contentSlugMetadata';
import {deriveExcerpt} from '@/src/lib/metadata/excerpt';
import {getErrorMessage, isTimeoutOrSocketError} from '@/src/lib/errors';
import {PodcastDetail} from '@/src/components/PodcastDetail';
import {RelatedContent} from '@/src/components/RelatedContent';
import {fetchPublishedSlugs} from '@/src/lib/publishedSlugs';
import {contentTag} from '@/src/lib/strapi/cacheTags';

type PageProps = {
    params: Promise<{slug: string}>;
};

/**
 * Pre-generate static params for all published podcasts at build time.
 * Returns an empty array if the CMS is unreachable, allowing ISR at runtime.
 */
export async function generateStaticParams() {
    try {
        const entries = await fetchPublishedSlugs('podcasts', [contentTag('podcast')]);
        return entries.map(({slug}) => ({slug}));
    } catch {
        return [];
    }
}

/**
 * Generate page metadata for a podcast episode identified by the route slug.
 *
 * Fetches the episode referenced by `params.slug` and, if found, produces metadata
 * containing the page title, description, canonical alternate URL, OpenGraph article
 * data (including `locale: 'de'`, `siteName`, `url`, `title`, `description`, and `images`)
 * and Twitter card fields. Returns an empty object when the slug is invalid or the episode
 * cannot be found.
 *
 * @param params - Route params resolving to an object with a `slug` string
 * @returns A Metadata object with title, description, alternates.canonical, `openGraph`, and `twitter` fields, or an empty object if metadata cannot be generated
 */
export async function generateMetadata({params}: PageProps): Promise<Metadata> {
    return buildContentSlugMetadata({
        params,
        canonicalPath: (slug) => `/podcasts/${slug}`,
        contentLabel: 'podcast',
        fetchBySlug: fetchPodcastBySlug,
        getTitle: (episode) => episode.title,
        getDescription: (episode) => episode.description?.trim() || deriveExcerpt(episode.shownotes),
        ogType: 'article',
        getMediaSource: (episode) => episode,
    });
}

/**
 * Render the podcast episode detail page for the given route slug; if the slug is invalid or the episode is not found, return a 404.
 *
 * @param params - Route parameters object containing the `slug` string
 * @returns The `PodcastDetail` React element for the resolved episode
 */
export default async function PodcastDetailPage({params}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) notFound();

    const episode = await fetchPodcastBySlug(slug).catch((error: unknown) => {
        const errorMessage = getErrorMessage(error);
        if (isTimeoutOrSocketError(error)) {
            console.error(`Socket/timeout error fetching podcast for slug "${slug}":`, errorMessage);
        } else if (!errorMessage.includes('404') && !errorMessage.includes('not found')) {
            console.error(`Error fetching podcast for slug "${slug}":`, errorMessage);
        }
        return null;
    });

    if (!episode) notFound();

    const categorySlugs = episode.categories?.map((c) => c.slug).filter(Boolean) as string[] ?? [];
    const [relatedArticles, relatedPodcasts] = await Promise.all([
        fetchRelatedArticles(categorySlugs, slug).catch(() => []),
        fetchRelatedPodcasts(categorySlugs, slug).catch(() => []),
    ]);

    return (
        <>
            <PodcastDetail slug={slug} podcast={episode} />
            <RelatedContent articles={relatedArticles} podcasts={relatedPodcasts} />
        </>
    );
}