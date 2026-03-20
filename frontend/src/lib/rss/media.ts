export type StrapiMediaFormat = {
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

export type StrapiMedia = {
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
    provider_metadata?: unknown;
    related?: unknown[]; // keep flexible; Strapi returns heterogeneous relations
    blurhash?: string | null;
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string | null;
};

export type StrapiMediaRef = {
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
    provider_metadata?: unknown;
    related?: unknown[]; // keep flexible; Strapi returns heterogeneous relations
    blurhash?: string | null;
    createdAt?: string;
    updatedAt?: string;
    publishedAt?: string | null;
    data?: {attributes?: StrapiMedia} | null;
    attributes?: StrapiMedia;
};

/** BaseContent component while it coexists with optional root duplicates (migration phase A). */
export type StrapiBaseContentLegacy = {
    title?: string | null;
    description?: string | null;
    date?: string | null;
    cover?: StrapiMediaRef | null;
    banner?: StrapiMediaRef | null;
};

/** Root content metadata (duplicate of `base` after migration; during phase A may be empty until backfill). */
export type StrapiContentMedia = {
    title: string;
    description?: string | null;
    date?: string | null;
    cover?: StrapiMediaRef | null;
    banner?: StrapiMediaRef | null;
    base?: StrapiBaseContentLegacy | null;
};

export type StrapiCategoryRef = {
    slug?: string;
    title?: string | null;
    description?: string | null;
    cover?: StrapiMediaRef | null;
    banner?: StrapiMediaRef | null;
    image?: StrapiMediaRef | null;
    base?: StrapiBaseContentLegacy | null;
};

/**
 * Prefer root title/description/date/cover/banner; fall back to `base` when root is unset (phase A).
 */
export function mergeContentMediaFromBase<
    T extends StrapiContentMedia & {base?: StrapiBaseContentLegacy | null},
>(entity: T): T {
    const b = entity.base;
    if (!b || typeof b !== 'object') {
        return entity;
    }
    const rootTitle = entity.title.trim().length > 0 ? entity.title : null;
    const baseTitle = typeof b.title === 'string' && b.title.trim().length > 0 ? b.title : null;
    return {
        ...entity,
        title: (rootTitle ?? baseTitle ?? '') as T['title'],
        description: entity.description ?? b.description ?? null,
        date: entity.date ?? b.date ?? null,
        cover: entity.cover ?? b.cover ?? null,
        banner: entity.banner ?? b.banner ?? null,
    };
}

export function mergeCategoryRefFromBase(
    cat: StrapiCategoryRef & {base?: StrapiBaseContentLegacy | null},
): StrapiCategoryRef {
    const merged = mergeContentMediaFromBase({
        title: cat.title ?? '',
        description: cat.description,
        date: undefined,
        cover: cat.cover,
        banner: cat.banner,
        base: cat.base,
    });
    return {
        ...cat,
        title: merged.title || cat.slug || null,
        description: merged.description,
        cover: merged.cover,
        banner: merged.banner,
    };
}

export function mergeListingEntryFromBase<
    T extends {title?: string; date?: string | null; base?: StrapiBaseContentLegacy | null},
>(item: T): T {
    const b = item.base;
    if (!b || typeof b !== 'object') return item;
    const hasRootTitle = item.title != null && String(item.title).trim().length > 0;
    return {
        ...item,
        title: hasRootTitle ? item.title : typeof b.title === 'string' ? b.title : item.title,
        date: item.date ?? b.date ?? null,
    };
}

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

export function normalizeStrapiMedia(ref: StrapiMediaRef | null | undefined): StrapiMedia {
    if (!ref) return {};
    const attrs = ref.attributes ?? ref.data?.attributes ?? ref;
    return {
        id: attrs.id,
        documentId: attrs.documentId,
        name: attrs.name,
        alternativeText: attrs.alternativeText,
        caption: attrs.caption,
        width: attrs.width,
        height: attrs.height,
        formats: attrs.formats,
        hash: attrs.hash,
        ext: attrs.ext,
        mime: attrs.mime,
        size: attrs.size,
        sizeInBytes: attrs.sizeInBytes,
        url: attrs.url,
        previewUrl: attrs.previewUrl,
        provider: attrs.provider,
        provider_metadata: attrs.provider_metadata,
        related: attrs.related,
        blurhash: attrs.blurhash,
        createdAt: attrs.createdAt,
        updatedAt: attrs.updatedAt,
        publishedAt: attrs.publishedAt,
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

    // If URL is already absolute, return as-is
    if (/^https?:\/\//i.test(media.url)) return media.url;

    // Use Strapi URL from environment variable
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL?.replace(/\/+$/, '');
    if (!strapiUrl) return undefined;

    const path = media.url.startsWith('/') ? media.url : `/${media.url}`;
    return `${strapiUrl}${path}`;
}

/**
 * Selects a cover media for content, preferring the entry's cover and falling back to the first category's cover or image.
 *
 * @param content - Optional content whose `cover` is checked first
 * @param categories - Optional list of category references; the first category's `cover` or `image` is used as a fallback
 * @returns The selected `StrapiMedia` (with a valid `url`) if one is found, `undefined` otherwise
 */
export function pickCoverMedia(content?: StrapiContentMedia, categories?: StrapiCategoryRef[]): StrapiMedia | undefined {
    const primary = normalizeStrapiMedia(content?.cover ?? undefined);
    if (primary.url) return primary;

    const firstCategory = categories?.[0];
    const categoryCover = normalizeStrapiMedia(
        firstCategory?.cover ?? firstCategory?.image ?? undefined,
    );
    if (categoryCover.url) return categoryCover;

    return undefined;
}

export function pickBannerMedia(content?: StrapiContentMedia, categories?: StrapiCategoryRef[]): StrapiMedia | undefined {
    const primary = normalizeStrapiMedia(content?.banner ?? undefined);
    if (primary.url) return primary;

    const firstCategory = categories?.[0];
    const categoryBanner = normalizeStrapiMedia(firstCategory?.banner ?? undefined);
    if (categoryBanner.url) return categoryBanner;

    return undefined;
}

/**
 * Selects banner media, falling back to cover media when no banner is available.
 *
 * @returns The chosen `StrapiMedia` containing a `url` when available, or `undefined` if neither banner nor cover media exist.
 */
export function pickBannerOrCoverMedia(content?: StrapiContentMedia, categories?: StrapiCategoryRef[]): StrapiMedia | undefined {
    // Try banner first
    const banner = pickBannerMedia(content, categories);
    if (banner?.url) return banner;

    // Fall back to cover
    return pickCoverMedia(content, categories);
}

/**
 * Selects cover media if present; otherwise returns banner media as a fallback.
 *
 * @returns The chosen `StrapiMedia` (cover preferred, banner fallback), or `undefined` if no media is available.
 */
export function pickCoverOrBannerMedia(content?: StrapiContentMedia, categories?: StrapiCategoryRef[]): StrapiMedia | undefined {
    // Try cover first
    const cover = pickCoverMedia(content, categories);
    if (cover?.url) return cover;

    // Fall back to banner
    return pickBannerMedia(content, categories);
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

    // Search for requested size or fallback to larger sizes
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
                provider_metadata: media.provider_metadata,
                related: media.related,
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
