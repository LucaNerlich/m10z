import {type Metadata} from 'next';
import {notFound} from 'next/navigation';

import {fetchPodcastBySlug} from '@/src/lib/strapiContent';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {absoluteRoute} from '@/src/lib/routes';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';
import {getOptimalMediaFormat, pickBannerOrCoverMedia} from '@/src/lib/rss/media';
import {PodcastDetail} from '@/src/components/PodcastDetail';

type PageProps = {
    params: Promise<{slug: string}>;
};

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
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return {};

    const episode = await fetchPodcastBySlug(slug);
    if (!episode) return {};

    const title = episode.base.title;
    const description = episode.base.description || undefined;
    const bannerOrCoverMedia = pickBannerOrCoverMedia(episode.base, episode.categories);
    const optimizedMedia = bannerOrCoverMedia ? getOptimalMediaFormat(bannerOrCoverMedia, 'medium') : undefined;
    const coverImage = optimizedMedia ? formatOpenGraphImage(optimizedMedia) : undefined;

    const openGraph: Metadata['openGraph'] = {
        type: 'article',
        locale: OG_LOCALE,
        siteName: OG_SITE_NAME,
        url: absoluteRoute(`/podcasts/${slug}`),
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
 * Render the podcast episode detail page for a route slug.
 * Fetches podcast server-side for metadata generation and passes it to client component.
 *
 * @param params - Route parameters object containing a `slug` string
 * @returns A React element containing the PodcastDetail client component
 */
export default async function PodcastDetailPage({params}: PageProps) {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return notFound();

    const episode = await fetchPodcastBySlug(slug);
    if (!episode) return notFound();

    return <PodcastDetail slug={slug} podcast={episode} />;
}
