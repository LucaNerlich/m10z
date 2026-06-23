import {type Metadata} from 'next';

import {getErrorMessage, isTimeoutOrSocketError} from '@/src/lib/errors';
import {formatOpenGraphImage} from '@/src/lib/metadata/formatters';
import {OG_LOCALE, OG_SITE_NAME} from '@/src/lib/metadata/constants';
import {absoluteRoute} from '@/src/lib/routes';
import {validateSlugSafe} from '@/src/lib/security/slugValidation';
import {getOptimalMediaFormat, pickBannerOrCoverMedia, type StrapiMediaRef} from '@/src/lib/strapi/media';

type MediaSource = {
    title?: string | null;
    cover?: StrapiMediaRef | null;
    banner?: StrapiMediaRef | null;
    categories?: {cover?: StrapiMediaRef | null; banner?: StrapiMediaRef | null}[];
};

type ContentSlugMetadataInput<T extends MediaSource> = {
    params: Promise<{slug: string}>;
    canonicalPath: (slug: string) => string;
    contentLabel: string;
    fetchBySlug: (slug: string) => Promise<T | null>;
    getTitle: (entity: T) => string;
    getDescription: (entity: T) => string | undefined;
    ogType?: 'article' | 'website' | 'profile';
    twitterCard?: 'summary' | 'summary_large_image';
    getOpenGraphExtras?: (entity: T) => Partial<NonNullable<Metadata['openGraph']>>;
    getAuthors?: (entity: T) => string[] | undefined;
    getMediaSource?: (entity: T) => MediaSource;
    getMetadataExtras?: (entity: T) => Partial<Metadata>;
};

function resolveCoverImage(source: MediaSource): ReturnType<typeof formatOpenGraphImage> | undefined {
    const bannerOrCoverMedia = pickBannerOrCoverMedia(
        {title: source.title ?? '', cover: source.cover, banner: source.banner},
        source.categories,
    );
    const optimizedMedia = bannerOrCoverMedia ? getOptimalMediaFormat(bannerOrCoverMedia, 'medium') : undefined;
    return optimizedMedia ? formatOpenGraphImage(optimizedMedia) : undefined;
}

/**
 * Build slug-page metadata for Articles, Podcasts, Categories, and Authors.
 */
export async function buildContentSlugMetadata<T extends MediaSource>({
                                                                          params,
                                                                          canonicalPath,
                                                                          contentLabel,
                                                                          fetchBySlug,
                                                                          getTitle,
                                                                          getDescription,
                                                                          ogType = 'website',
                                                                          twitterCard = 'summary_large_image',
                                                                          getOpenGraphExtras,
                                                                          getAuthors,
                                                                          getMediaSource,
                                                                          getMetadataExtras,
                                                                      }: ContentSlugMetadataInput<T>): Promise<Metadata> {
    const {slug: rawSlug} = await params;
    const slug = validateSlugSafe(rawSlug);
    if (!slug) return {};

    try {
        const entity = await fetchBySlug(slug);
        if (!entity) return {};

        const title = getTitle(entity);
        const description = getDescription(entity);
        const mediaSource = getMediaSource ? getMediaSource(entity) : entity;
        const coverImage = resolveCoverImage(mediaSource);
        const authors = getAuthors?.(entity);
        const url = absoluteRoute(canonicalPath(slug));

        return {
            title,
            description,
            alternates: {canonical: url},
            openGraph: {
                type: ogType,
                locale: OG_LOCALE,
                siteName: OG_SITE_NAME,
                url,
                title,
                description,
                images: coverImage,
                ...getOpenGraphExtras?.(entity),
            },
            twitter: {
                card: twitterCard,
                title,
                description,
                images: coverImage,
            },
            ...(authors ? {authors: authors.map((name) => ({name}))} : {}),
            ...getMetadataExtras?.(entity),
        };
    } catch (error) {
        const errorMessage = getErrorMessage(error);

        if (isTimeoutOrSocketError(error)) {
            console.error(`Socket/timeout error fetching ${contentLabel} metadata for slug "${slug}":`, errorMessage);
        } else {
            console.error(`Error fetching ${contentLabel} metadata for slug "${slug}":`, errorMessage);
        }

        return {};
    }
}
