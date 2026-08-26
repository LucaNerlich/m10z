import {joinStrapiBaseUrl} from '@/src/lib/image';

type StrapiMediaFormat = {
    ext?: string | null;
    url?: string;
    hash?: string;
    mime?: string;
    name?: string;
    path?: string | null;
    size?: number;
    width?: number;
    height?: number;
    sizeInBytes?: number;
};

// Shared field shape for both flat v5 media objects and wrapped media references.
type StrapiMediaShape = {
    id?: number;
    documentId?: string;
    name?: string;
    alternativeText?: string | null;
    caption?: string | null;
    width?: number;
    height?: number;
    formats?: Record<string, StrapiMediaFormat>;
    hash?: string;
    ext?: string;
    mime?: string;
    size?: number;
    sizeInBytes?: number;
    url?: string;
    previewUrl?: string | null;
    provider?: string;
    blurhash?: string | null;
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string | null;
};

export type StrapiMedia = StrapiMediaShape;

/** Media reference as embedded in content payloads (flat Strapi v5 shape). */
export type StrapiMediaRef = StrapiMedia;

export type StrapiContentMedia = {
    title: string;
    description?: string | null;
    date?: string | null;
    cover?: StrapiMediaRef | null;
    banner?: StrapiMediaRef | null;
};

export type StrapiCategoryRef = {
    slug?: string;
    title?: string | null;
    description?: string | null;
    cover?: StrapiMediaRef | null;
    banner?: StrapiMediaRef | null;
    image?: StrapiMediaRef | null;
};

export type StrapiAuthor = {
    id: number;
    documentId?: string;
    title?: string | null;
    slug?: string | null;
    description?: string | null;
    avatar?: StrapiMediaRef | null;
};

export type StrapiYoutube = {
    id: number;
    title?: string | null;
    url: string;
}

export type ImageSize = 'thumbnail' | 'small' | 'medium' | 'large';

const IMAGE_SIZES_ORDERED: ImageSize[] = ['thumbnail', 'small', 'medium', 'large'];

// Strapi 5 returns media as flat objects: { url, width, ... }.
// This normalizer copies the fields into a plain StrapiMedia object.
export function normalizeStrapiMedia(ref: StrapiMediaRef | null | undefined): StrapiMedia {
    if (!ref) return {};
    return {
        id: ref.id,
        documentId: ref.documentId,
        name: ref.name,
        alternativeText: ref.alternativeText,
        caption: ref.caption,
        width: ref.width,
        height: ref.height,
        formats: ref.formats,
        hash: ref.hash,
        ext: ref.ext,
        mime: ref.mime,
        size: ref.size,
        sizeInBytes: ref.sizeInBytes,
        url: ref.url,
        previewUrl: ref.previewUrl,
        provider: ref.provider,
        blurhash: ref.blurhash,
        createdAt: ref.createdAt,
        updatedAt: ref.updatedAt,
        publishedAt: ref.publishedAt,
    };
}

/**
 * Produce an absolute URL for a Strapi media object when possible.
 *
 * Accepts a media reference and returns its absolute URL if the media has a URL and it can be resolved.
 *
 * @param args - Function arguments
 * @param args.media - A Strapi media object (or `undefined`). If `media.url` starts with `http://` or `https://`, it is returned unchanged; if `media.url` is a relative path, `NEXT_PUBLIC_STRAPI_URL` is used to build the absolute URL.
 * @returns The absolute URL string for the media when available, `undefined` otherwise.
 */
export function mediaUrlToAbsolute(args: {
    media: StrapiMedia | undefined;
}): string | undefined {
    const {media} = args;
    if (!media?.url) return undefined;
    return joinStrapiBaseUrl(media.url) ?? undefined;
}

type MediaField = 'cover' | 'banner';

/**
 * Resolve the media for `field`, preferring the entry's own value and falling
 * back to the first category. Cover additionally falls back to the category
 * image; banner only to the category banner.
 */
function pickMediaByField(
    content: StrapiContentMedia | undefined,
    categories: StrapiCategoryRef[] | undefined,
    field: MediaField,
): StrapiMedia | undefined {
    const primary = normalizeStrapiMedia(content?.[field] ?? undefined);
    if (primary.url) return primary;

    const firstCategory = categories?.[0];
    const categoryCandidate = field === 'cover'
        ? (firstCategory?.cover ?? firstCategory?.image)
        : firstCategory?.banner;
    const categoryMedia = normalizeStrapiMedia(categoryCandidate);
    if (categoryMedia.url) return categoryMedia;

    return undefined;
}

/**
 * Selects a cover media for content, preferring the entry's cover and falling back to the first category's cover or image.
 *
 * @param content - Optional content whose `cover` is checked first
 * @param categories - Optional list of category references; the first category's `cover` or `image` is used as a fallback
 * @returns The selected `StrapiMedia` (with a valid `url`) if one is found, `undefined` otherwise
 */
export function pickCoverMedia(content?: StrapiContentMedia, categories?: StrapiCategoryRef[]): StrapiMedia | undefined {
    return pickMediaByField(content, categories, 'cover');
}

export function pickBannerMedia(content?: StrapiContentMedia, categories?: StrapiCategoryRef[]): StrapiMedia | undefined {
    return pickMediaByField(content, categories, 'banner');
}

function pickPreferredMedia(
    content: StrapiContentMedia | undefined,
    categories: StrapiCategoryRef[] | undefined,
    preferred: MediaField,
    fallback: MediaField,
): StrapiMedia | undefined {
    const preferredMedia = pickMediaByField(content, categories, preferred);
    if (preferredMedia?.url) return preferredMedia;

    return pickMediaByField(content, categories, fallback);
}

/**
 * Selects banner media, falling back to cover media when no banner is available.
 *
 * @returns The chosen `StrapiMedia` containing a `url` when available, or `undefined` if neither banner nor cover media exist.
 */
export function pickBannerOrCoverMedia(content?: StrapiContentMedia, categories?: StrapiCategoryRef[]): StrapiMedia | undefined {
    return pickPreferredMedia(content, categories, 'banner', 'cover');
}

/**
 * Selects cover media if present; otherwise returns banner media as a fallback.
 *
 * @returns The chosen `StrapiMedia` (cover preferred, banner fallback), or `undefined` if no media is available.
 */
export function pickCoverOrBannerMedia(content?: StrapiContentMedia, categories?: StrapiCategoryRef[]): StrapiMedia | undefined {
    return pickPreferredMedia(content, categories, 'cover', 'banner');
}

/**
 * Selects the optimal image format from a StrapiMedia object based on the requested size.
 *
 * Searches for the requested format size in media.formats. If not found, falls back to the next larger size.
 * Returns a new StrapiMedia object with format-specific properties merged with root metadata, excluding the formats property.
 *
 * @param media - The StrapiMedia object (or null/undefined) to extract format from
 * @param requestedSize - The desired image size ('thumbnail', 'small', 'medium', or 'large')
 * @returns A StrapiMedia object with optimal format properties, or empty object if input is null/undefined, or original media if no format found
 */
export function getOptimalMediaFormat(
    media: StrapiMedia | null | undefined,
    requestedSize: ImageSize,
): StrapiMedia {
    if (!media) return {};

    const formats = media.formats;
    if (!formats || typeof formats !== 'object') {
        // No formats available, return original media without formats property
        const {formats: _, ...rest} = media;
        return rest;
    }

    // Find the requested size index
    const requestedIndex = IMAGE_SIZES_ORDERED.indexOf(requestedSize);
    if (requestedIndex === -1) {
        // Invalid size requested, return original media without formats
        const {formats: _, ...rest} = media;
        return rest;
    }

    // Walk up from the requested size to find the nearest available format.
    // E.g., requesting "medium" will try medium → large → original.
    for (let i = requestedIndex; i < IMAGE_SIZES_ORDERED.length; i++) {
        const size = IMAGE_SIZES_ORDERED[i];
        const format = formats[size];
        if (format && format.url) {
            // Found a matching format, merge format properties with root metadata
            return {
                id: media.id,
                documentId: media.documentId,
                name: media.name,
                alternativeText: media.alternativeText,
                caption: media.caption,
                url: format.url,
                width: format.width,
                height: format.height,
                ext: format.ext ?? media.ext,
                hash: format.hash ?? media.hash,
                mime: format.mime ?? media.mime,
                size: format.size ?? media.size,
                sizeInBytes: format.sizeInBytes ?? media.sizeInBytes,
                previewUrl: media.previewUrl,
                provider: media.provider,
                blurhash: media.blurhash,
                createdAt: media.createdAt,
                updatedAt: media.updatedAt,
                publishedAt: media.publishedAt,
            };
        }
    }

    // No matching format found, return original media without formats property
    const {formats: _, ...rest} = media;
    return rest;
}
